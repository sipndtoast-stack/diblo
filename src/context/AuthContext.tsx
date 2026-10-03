import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User, UserRole, CustomerProfile, AssistantProfile } from '../types';
import { api, tokenStorage, StaffSession, staffSessionStorage } from '../lib/api';
import { MOCK_ASSISTANTS } from '../data/mockData';
import { useIdleTimer, DEFAULT_IDLE_TIMEOUT_MS } from '../hooks/useIdleTimer';
import {
  db,
  auth,
  isFirebaseConfigured,
  ensureFirebaseAuthSession,
  clearActiveRecaptchaVerifier,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';

const DEFAULT_USERS: Record<UserRole, User> = {
  CUSTOMER: {
    id: '',
    name: 'Customer',
    phone: '',
    email: '',
    role: 'CUSTOMER',
    avatar: '',
    createdAt: new Date().toISOString()
  },
  ASSISTANT: {
    id: '',
    name: 'Assistant',
    phone: '',
    email: '',
    role: 'ASSISTANT',
    avatar: '',
    createdAt: new Date().toISOString()
  },
  ADMIN: {
    id: '',
    name: 'Admin',
    phone: '',
    email: '',
    role: 'ADMIN',
    avatar: '',
    createdAt: new Date().toISOString()
  },
  OPERATIONS: {
    id: '',
    name: 'Operations',
    phone: '',
    email: '',
    role: 'OPERATIONS',
    avatar: '',
    createdAt: new Date().toISOString()
  }
};

const DEFAULT_ASSISTANT_PROFILE: AssistantProfile | null = null;

const LIVE_DEVICE_LOGIN_KEY = 'diblo_live_login_v2';

function isSyntheticPlaceholderEmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  if (!lower.endsWith('@diblo-39440.firebaseapp.com')) return false;
  // Valid customer bridge email must contain a real 10-digit Indian phone number (not demo phones)
  const custMatch = lower.match(/^diblo\.customer\.([6-9]\d{9})@diblo-39440\.firebaseapp\.com$/);
  if (custMatch) {
    const phone = custMatch[1];
    return phone === '9820123456' || phone === '9820554433';
  }
  // Valid staff bridge email must not be generic 'assistant', 'admin', 'asst1', '9820554433'
  const staffMatch = lower.match(/^diblo\.(assistant|admin|operations)\.([a-z0-9]+)@diblo-39440\.firebaseapp\.com$/);
  if (staffMatch) {
    const id = staffMatch[2];
    return id === 'assistant' || id === 'admin' || id === 'operations' || id === 'asst1' || id === '9820554433';
  }
  return true;
}

function hasLiveDeviceLoginFlag(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(LIVE_DEVICE_LOGIN_KEY) === 'true';
    }
  } catch {}
  return false;
}

function isStaleDemoCustomer(obj: any): boolean {
  if (!obj) return true;
  if (obj.id === 'cust-1' || obj.id === 'user-c-1' || obj.userId === 'user-c-1' || obj.id === 'cust-customer') return true;
  if (typeof obj.name === 'string') {
    const lower = obj.name.trim().toLowerCase();
    if (
      lower === 'aarav mehta' ||
      lower === 'rohan desai' ||
      lower === 'neha kapoor' ||
      lower === 'rajesh sharma' ||
      lower === 'diblo user'
    ) {
      return true;
    }
  }
  if (obj.phone === '9820123456' || obj.phone === '9820554433' || obj.phone === '9820000000') return true;
  if (isSyntheticPlaceholderEmail(obj.email)) return true;
  const cleanPhone = String(obj.phone || '').replace(/\D/g, '').slice(-10);
  const hasValidPhone = /^[6-9]\d{9}$/.test(cleanPhone);
  const hasRealEmail = Boolean(
    obj.email &&
      typeof obj.email === 'string' &&
      obj.email.includes('@') &&
      !obj.email.endsWith('@diblo-39440.firebaseapp.com')
  );
  if (!hasValidPhone && !hasRealEmail) return true;
  return false;
}

export function calculateCustomerProfileCompletion(profile: Partial<CustomerProfile> | null | undefined): number {
  if (!profile) return 0;
  let score = 0;

  const rawName = String(profile.displayName || profile.name || '').trim();
  const isPlaceholderName =
    !rawName ||
    rawName.length < 3 ||
    rawName.toLowerCase() === 'customer' ||
    rawName.toLowerCase() === 'diblo user' ||
    /^customer\s+\d{4}$/i.test(rawName);
  if (!isPlaceholderName) {
    score += 20;
  }

  const cleanPhone = String(profile.phone || '').replace(/\D/g, '').slice(-10);
  if (
    /^[6-9]\d{9}$/.test(cleanPhone) &&
    cleanPhone !== '9820000000' &&
    cleanPhone !== '9820123456' &&
    cleanPhone !== '9820554433'
  ) {
    score += 15;
  }

  const rawEmail = String(profile.email || '').trim().toLowerCase();
  const isPlaceholderEmail =
    !rawEmail ||
    !rawEmail.includes('@') ||
    !rawEmail.includes('.') ||
    rawEmail.endsWith('@diblo.in') ||
    rawEmail.endsWith('@diblo-39440.firebaseapp.com') ||
    /^\d{10,}@example\.com$/.test(rawEmail);
  if (!isPlaceholderEmail) {
    score += 15;
  }

  if (profile.avatar && String(profile.avatar).trim().length > 0) {
    score += 15;
  }

  const validAddresses = Array.isArray(profile.savedAddresses)
    ? profile.savedAddresses.filter(
        (a) =>
          a &&
          String(a.address || '').trim().length >= 3 &&
          String(a.address || '').trim() !== 'Mumbai, Maharashtra'
      )
    : [];
  if (validAddresses.length > 0) {
    score += 15;
  }

  const emName = String(profile.emergencyContact?.name || '').trim();
  const emPhone = String(profile.emergencyContact?.phone || '').replace(/\D/g, '').slice(-10);
  if (
    emName.length >= 2 &&
    emName.toLowerCase() !== 'emergency contact' &&
    /^[6-9]\d{9}$/.test(emPhone) &&
    emPhone !== '9820000000'
  ) {
    score += 10;
  }

  if (profile.specialInstructions && String(profile.specialInstructions).trim().length >= 2) {
    score += 10;
  }

  return Math.min(score, 100);
}

function mergeCustomerProfileSources(
  sources: Array<Partial<CustomerProfile> | Record<string, any> | null | undefined>,
  fallback: { id: string; userId: string; name?: string; phone?: string; email?: string }
): CustomerProfile {
  const result: CustomerProfile = {
    id: fallback.id,
    userId: fallback.userId,
    name: fallback.name || 'Customer',
    displayName: fallback.name || 'Customer',
    phone: fallback.phone || '',
    email: fallback.email || '',
    avatar: '',
    savedAddresses: [],
    emergencyContact: { name: '', phone: '', relationship: 'Family' },
    specialInstructions: '',
    preferredLanguage: 'English',
    referralCode: 'DIBLO100',
    walletBalance: 100,
    profileCompleted: false,
    profileCompletion: 0,
    createdAt: new Date().toISOString()
  };

  for (const rawSrc of sources) {
    if (!rawSrc || typeof rawSrc !== 'object') continue;
    const src = rawSrc as Record<string, any>;
    if (src.id && typeof src.id === 'string') result.id = src.id;
    if ((src.userId || src.uid) && typeof (src.userId || src.uid) === 'string') {
      result.userId = src.userId || src.uid;
    }

    const candidateName = String(src.displayName || src.name || '').trim();
    if (
      candidateName &&
      candidateName.toLowerCase() !== 'customer' &&
      !/^customer\s+\d{4}$/i.test(candidateName)
    ) {
      result.name = candidateName;
      result.displayName = candidateName;
    } else if (candidateName && result.name === 'Customer') {
      result.name = candidateName;
      result.displayName = candidateName;
    }

    const candidatePhone = String(src.phone || '').replace(/\D/g, '').slice(-10);
    if (/^[6-9]\d{9}$/.test(candidatePhone) && candidatePhone !== '9820000000') {
      result.phone = candidatePhone;
    }

    const candidateEmail = String(src.email || '').trim();
    if (
      candidateEmail &&
      candidateEmail.includes('@') &&
      !candidateEmail.endsWith('@diblo.in') &&
      !candidateEmail.endsWith('@diblo-39440.firebaseapp.com')
    ) {
      result.email = candidateEmail;
    } else if (candidateEmail && !result.email) {
      result.email = candidateEmail;
    }

    if (src.avatar && String(src.avatar).trim().length > 0) {
      result.avatar = String(src.avatar).trim();
    }
    if (src.alternatePhone && String(src.alternatePhone).trim().length > 0) {
      result.alternatePhone = String(src.alternatePhone).trim();
    }
    if (src.gender && String(src.gender).trim().length > 0) {
      result.gender = String(src.gender).trim();
    }
    if (src.dob && String(src.dob).trim().length > 0) {
      result.dob = String(src.dob).trim();
    }
    if (src.preferredLanguage && String(src.preferredLanguage).trim().length > 0) {
      result.preferredLanguage = String(src.preferredLanguage).trim();
    }
    if (src.bloodGroup && String(src.bloodGroup).trim().length > 0) {
      result.bloodGroup = String(src.bloodGroup).trim();
    }
    if (src.specialInstructions && String(src.specialInstructions).trim().length > 0) {
      result.specialInstructions = String(src.specialInstructions).trim();
    }
    if (src.contactPreferences) {
      result.contactPreferences = src.contactPreferences;
    }
    if (Array.isArray(src.savedAddresses) && src.savedAddresses.length > 0) {
      const nonPlaceholder = src.savedAddresses.filter(
        (a: any) => a && String(a.address || '').trim() !== 'Mumbai, Maharashtra'
      );
      if (nonPlaceholder.length > 0) {
        result.savedAddresses = nonPlaceholder;
      }
    }
    if (src.emergencyContact && typeof src.emergencyContact === 'object') {
      const emName = String(src.emergencyContact.name || '').trim();
      const emPhone = String(src.emergencyContact.phone || '').trim();
      if (
        emName &&
        emName.toLowerCase() !== 'emergency contact' &&
        emPhone &&
        emPhone !== '9820000000'
      ) {
        result.emergencyContact = {
          name: emName,
          phone: emPhone,
          relationship: String(src.emergencyContact.relationship || 'Family').trim()
        };
      }
    }
    if (Array.isArray(src.favoriteAssistantIds) && src.favoriteAssistantIds.length > 0) {
      result.favoriteAssistantIds = src.favoriteAssistantIds;
    }
    if (Array.isArray(src.mandatoryDocuments) && src.mandatoryDocuments.length > 0) {
      result.mandatoryDocuments = src.mandatoryDocuments;
    }
    if (Array.isArray(src.documents) && src.documents.length > 0) {
      result.documents = src.documents;
      if (!result.mandatoryDocuments || result.mandatoryDocuments.length === 0) {
        result.mandatoryDocuments = src.documents;
      }
    }
    if (src.referralCode) {
      result.referralCode = src.referralCode;
    }
    if (typeof src.walletBalance === 'number') {
      result.walletBalance = src.walletBalance;
    }
    if (src.createdAt) {
      result.createdAt = src.createdAt;
    }
  }

  const completion = calculateCustomerProfileCompletion(result);
  result.profileCompletion = completion;
  result.profileCompleted = completion === 100;
  return result;
}

export interface AuthContextType {
  currentUser: User;
  currentRole: UserRole;
  customerProfile: CustomerProfile | null;
  customerProfileCompletion: number;
  isCustomerProfileComplete: boolean;
  assistantProfile: AssistantProfile | null;
  staffUser: StaffSession | null;
  isAuthenticated: boolean;
  isCustomerAuthenticated: boolean;
  isAuthLoading: boolean;
  firebaseCustomer: FirebaseUser | null;
  isLoading: boolean;
  isFirebaseLive: boolean;
  switchRole: (role: UserRole) => Promise<void>;
  updateCustomerProfile: (profile: Partial<CustomerProfile>) => void;
  updateAssistantProfile: (profile: Partial<AssistantProfile>) => void;
  favoriteAssistantIds: string[];
  toggleFavoriteAssistant: (assistantId: string) => Promise<boolean>;
  isAssistantFavorited: (assistantId: string) => boolean;
  loginStaff: (mobileNumber: string, password: string) => Promise<{ success: boolean; role?: 'Assistant' | 'Admin'; message?: string; code?: string; eplId?: string; name?: string; number?: string; email?: string }>;
  logoutStaff: () => Promise<void>;
  logoutCustomer: () => Promise<void>;
  logout?: () => Promise<void>;
  syncFirebaseCustomer: (user: FirebaseUser, extra?: { phone?: string; name?: string; email?: string }) => Promise<CustomerProfile | null>;
  syncCustomerByPhone?: (phone: string, name?: string) => Promise<void>;
  loginWithPhoneOtp?: (phone: string, otp: string, role?: UserRole, name?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithEmailPassword: (
    identifier: string,
    pass: string,
    role?: UserRole,
    name?: string,
    isSignUp?: boolean
  ) => Promise<{
    success: boolean;
    isNewCustomer?: boolean;
    profileCompleted?: boolean;
    error?: string;
    code?: string;
  }>;
  loginDemoUser?: (role: UserRole) => Promise<{ success: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initial staff session from secure storage (only if verified live login on this device)
  const [staffUser, setStaffUser] = useState<StaffSession | null>(() => {
    if (!hasLiveDeviceLoginFlag()) {
      staffSessionStorage.clear();
      return null;
    }
    return staffSessionStorage.getSession();
  });
  const initialRole = tokenStorage.getActiveRole() || 'CUSTOMER';
  const [currentRole, setCurrentRole] = useState<UserRole>(initialRole);
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      if (!hasLiveDeviceLoginFlag()) {
        localStorage.removeItem('diblo_customer_profile');
        return DEFAULT_USERS.CUSTOMER;
      }
      const savedCust = localStorage.getItem('diblo_customer_profile');
      if (savedCust) {
        const parsed = JSON.parse(savedCust);
        if (isStaleDemoCustomer(parsed)) {
          localStorage.removeItem('diblo_customer_profile');
        } else if (initialRole === 'CUSTOMER') {
          return {
            id: parsed.userId || parsed.id || '',
            name: parsed.name || 'Customer',
            phone: parsed.phone || '',
            email: parsed.email || '',
            role: 'CUSTOMER',
            avatar: parsed.avatar || '',
            createdAt: parsed.createdAt || new Date().toISOString()
          };
        }
      }
    } catch {}
    return DEFAULT_USERS[initialRole] || DEFAULT_USERS.CUSTOMER;
  });
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(() => {
    try {
      if (!hasLiveDeviceLoginFlag()) {
        localStorage.removeItem('diblo_customer_profile');
        return null;
      }
      const saved = localStorage.getItem('diblo_customer_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (isStaleDemoCustomer(parsed)) {
          localStorage.removeItem('diblo_customer_profile');
          return null;
        }
        return parsed;
      }
    } catch {}
    return null;
  });
  const [assistantProfile, setAssistantProfile] = useState<AssistantProfile | null>(DEFAULT_ASSISTANT_PROFILE);
  const [isLoading] = useState<boolean>(false);
  const [firebaseCustomer, setFirebaseCustomer] = useState<FirebaseUser | null>(() => auth?.currentUser || null);
  const [isCustomerAuthenticated, setIsCustomerAuthenticated] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('diblo_customer_profile');
      if (saved && hasLiveDeviceLoginFlag()) {
        const parsed = JSON.parse(saved);
        if (!isStaleDemoCustomer(parsed) && (parsed.phone || parsed.email)) return true;
      }
    } catch {}
    return Boolean(
      auth?.currentUser &&
        !isSyntheticPlaceholderEmail(auth.currentUser.email) &&
        !auth.currentUser.email?.startsWith('diblo.assistant.') &&
        !auth.currentUser.email?.startsWith('diblo.admin.') &&
        !auth.currentUser.email?.startsWith('diblo.operations.')
    );
  });
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Unified helper to load, merge, and persist customer profile from Firestore + local cache + backend
  const loadAndSyncCustomerProfile = async (
    fbUser: FirebaseUser,
    extra?: { phone?: string; name?: string; email?: string; isNewUser?: boolean }
  ): Promise<CustomerProfile> => {
    try {
      localStorage.setItem(LIVE_DEVICE_LOGIN_KEY, 'true');
    } catch {}

    const emailBridgeMatch = fbUser.email?.match(/^diblo\.customer\.([6-9]\d{9})@/);
    const bridgePhone = emailBridgeMatch ? emailBridgeMatch[1] : '';
    const isBridgeEmail = Boolean(
      fbUser.email &&
        (fbUser.email.endsWith('@diblo-39440.firebaseapp.com') || fbUser.email.endsWith('@diblo.in'))
    );

    // 1. Read cached profile only if it belongs to this same user
    let sameUserCached: Partial<CustomerProfile> | null = null;
    if (!extra?.isNewUser) {
      try {
        const rawSaved = localStorage.getItem('diblo_customer_profile');
        if (rawSaved) {
          const parsed = JSON.parse(rawSaved);
          if (parsed && !isStaleDemoCustomer(parsed)) {
            const matchesUid = parsed.userId === fbUser.uid || parsed.id === fbUser.uid;
            const matchesPhone =
              bridgePhone && parsed.phone && String(parsed.phone).slice(-10) === bridgePhone;
            const matchesEmail =
              !isBridgeEmail &&
              fbUser.email &&
              parsed.email &&
              String(parsed.email).toLowerCase() === fbUser.email.toLowerCase();
            if (matchesUid || matchesPhone || matchesEmail) {
              sameUserCached = parsed;
            }
          }
        }
      } catch {}
    }

    // 2. Read Firestore users/{uid}
    let firestoreUserData: Record<string, any> | null = null;
    try {
      if (db && typeof getDoc === 'function') {
        const userSnap = await getDoc(doc(db, 'users', fbUser.uid));
        if (userSnap && typeof userSnap.exists === 'function' && userSnap.exists()) {
          firestoreUserData = userSnap.data();
        }
      }
    } catch {
      // Non-fatal
    }

    const rawPhone =
      extra?.phone ||
      fbUser.phoneNumber ||
      bridgePhone ||
      firestoreUserData?.phone ||
      sameUserCached?.phone ||
      '';
    const cleanPhone = String(rawPhone).replace('+91', '').replace(/\D/g, '').slice(-10);
    const validPhone = /^[6-9]\d{9}$/.test(cleanPhone) ? cleanPhone : '';

    const resolvedCustomerId =
      firestoreUserData?.customerId ||
      sameUserCached?.id ||
      (validPhone ? `cust-${validPhone}` : fbUser.uid);

    // 3. Read Firestore customers/{customerId}
    let firestoreCustomerData: Record<string, any> | null = null;
    try {
      if (db && typeof getDoc === 'function') {
        const custSnap = await getDoc(doc(db, 'customers', resolvedCustomerId));
        if (custSnap && typeof custSnap.exists === 'function' && custSnap.exists()) {
          firestoreCustomerData = custSnap.data();
        } else if (resolvedCustomerId !== fbUser.uid) {
          const fallbackSnap = await getDoc(doc(db, 'customers', fbUser.uid));
          if (fallbackSnap && typeof fallbackSnap.exists === 'function' && fallbackSnap.exists()) {
            firestoreCustomerData = fallbackSnap.data();
          }
        }
      }
    } catch {
      // Non-fatal
    }

    // 4. Read Backend customer record if phone is available
    let backendCust: Partial<CustomerProfile> | null = null;
    if (validPhone) {
      const fetched = await api.getCustomer(validPhone).catch(() => null);
      if (fetched && !(fetched as any).error && !isStaleDemoCustomer(fetched)) {
        backendCust = fetched;
      }
    }

    const extraSource: Partial<CustomerProfile> = {
      id: resolvedCustomerId,
      userId: fbUser.uid,
      ...(extra?.name ? { name: extra.name, displayName: extra.name } : {}),
      ...(validPhone ? { phone: validPhone } : {}),
      ...(extra?.email && !extra.email.endsWith('@diblo-39440.firebaseapp.com')
        ? { email: extra.email }
        : !isBridgeEmail && fbUser.email
        ? { email: fbUser.email }
        : {}),
      ...(fbUser.photoURL ? { avatar: fbUser.photoURL } : {})
    };

    // Order sources so newer timestamps win
    const cachedTime = sameUserCached?.updatedAt ? new Date(sameUserCached.updatedAt).getTime() : 0;
    const firestoreTime = Math.max(
      firestoreUserData?.updatedAt ? new Date(firestoreUserData.updatedAt).getTime() : 0,
      firestoreCustomerData?.updatedAt ? new Date(firestoreCustomerData.updatedAt).getTime() : 0
    );

    const orderedSources =
      cachedTime > firestoreTime
        ? [backendCust, firestoreCustomerData, firestoreUserData, sameUserCached, extraSource]
        : [backendCust, sameUserCached, firestoreCustomerData, firestoreUserData, extraSource];

    const mergedProfile = mergeCustomerProfileSources(orderedSources, {
      id: resolvedCustomerId,
      userId: fbUser.uid,
      name:
        extra?.name ||
        firestoreUserData?.displayName ||
        firestoreUserData?.name ||
        fbUser.displayName ||
        'Customer',
      phone: validPhone,
      email:
        extra?.email ||
        (!isBridgeEmail && fbUser.email ? fbUser.email : '') ||
        firestoreUserData?.email ||
        ''
    });

    // Persist full merged profile to Firestore users/{uid} and customers/{customerId}
    const firestorePayload: Record<string, any> = {
      id: mergedProfile.id,
      uid: fbUser.uid,
      userId: fbUser.uid,
      customerId: mergedProfile.id,
      role: 'CUSTOMER',
      name: mergedProfile.name,
      displayName: mergedProfile.displayName || mergedProfile.name,
      phone: mergedProfile.phone || '',
      email: mergedProfile.email || '',
      avatar: mergedProfile.avatar || '',
      alternatePhone: mergedProfile.alternatePhone || '',
      gender: mergedProfile.gender || '',
      dob: mergedProfile.dob || '',
      preferredLanguage: mergedProfile.preferredLanguage || 'English',
      bloodGroup: mergedProfile.bloodGroup || '',
      specialInstructions: mergedProfile.specialInstructions || '',
      savedAddresses: mergedProfile.savedAddresses || [],
      emergencyContact: mergedProfile.emergencyContact || { name: '', phone: '', relationship: 'Family' },
      favoriteAssistantIds: mergedProfile.favoriteAssistantIds || [],
      referralCode: mergedProfile.referralCode || 'DIBLO100',
      walletBalance: mergedProfile.walletBalance ?? 100,
      profileCompletion: mergedProfile.profileCompletion ?? 0,
      profileCompleted: Boolean(mergedProfile.profileCompleted),
      updatedAt: new Date().toISOString()
    };
    if (mergedProfile.contactPreferences) {
      firestorePayload.contactPreferences = mergedProfile.contactPreferences;
    }

    try {
      if (db && typeof setDoc === 'function') {
        await setDoc(doc(db, 'users', fbUser.uid), firestorePayload, { merge: true });
        await setDoc(doc(db, 'customers', mergedProfile.id), firestorePayload, { merge: true });
      }
    } catch {
      // Non-fatal
    }

    if (validPhone && !backendCust) {
      api.createCustomerProfile({
        id: mergedProfile.id,
        userId: fbUser.uid,
        name: mergedProfile.name,
        phone: validPhone,
        email: mergedProfile.email || `${validPhone}@diblo.in`,
        walletBalance: mergedProfile.walletBalance ?? 100
      }).catch(() => null);
    }

    try {
      localStorage.setItem('diblo_customer_profile', JSON.stringify(mergedProfile));
    } catch {}

    return mergedProfile;
  };

  // Restore Firebase Authentication for Customer or Assistant/Admin automatically on device load
  useEffect(() => {
    let isMounted = true;
    if (auth && typeof setPersistence === 'function' && browserLocalPersistence) {
      setPersistence(auth, browserLocalPersistence).catch(() => {});
    }

    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setIsAuthLoading(false);
      }
    }, 4500);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMounted) return;

      if (fbUser && isSyntheticPlaceholderEmail(fbUser.email)) {
        try {
          localStorage.removeItem('diblo_customer_profile');
          staffSessionStorage.clear();
          await signOut(auth);
        } catch {}
        if (isMounted) {
          setFirebaseCustomer(null);
          setIsCustomerAuthenticated(false);
          setCustomerProfile(null);
          setStaffUser(null);
          setIsAuthLoading(false);
        }
        return;
      }

      const isStaffAuthAccount =
        fbUser?.email?.startsWith('diblo.assistant.') ||
        fbUser?.email?.startsWith('diblo.admin.') ||
        fbUser?.email?.startsWith('diblo.operations.');

      if (fbUser && !isStaffAuthAccount) {
        setFirebaseCustomer(fbUser);
        setIsCustomerAuthenticated(true);

        const cust = await loadAndSyncCustomerProfile(fbUser);

        if (isMounted) {
          setCustomerProfile(cust);
          setCurrentRole('CUSTOMER');
          tokenStorage.setActiveRole('CUSTOMER');
          setCurrentUser({
            id: fbUser.uid,
            name: cust.name || 'Customer',
            phone: cust.phone || '',
            email: cust.email || '',
            role: 'CUSTOMER',
            avatar: cust.avatar || fbUser.photoURL || '',
            createdAt: fbUser.metadata?.creationTime || cust.createdAt || new Date().toISOString()
          });
          setIsAuthLoading(false);
        }
      } else if (fbUser && isStaffAuthAccount) {
        // Restore Assistant or Admin session from Firebase Auth + Firestore users/{uid}
        let firestoreStaffData: Record<string, any> | null = null;
        try {
          if (db && typeof getDoc === 'function') {
            const userSnap = await getDoc(doc(db, 'users', fbUser.uid));
            if (userSnap && typeof userSnap.exists === 'function' && userSnap.exists()) {
              firestoreStaffData = userSnap.data();
            }
          }
        } catch {
          // Non-fatal
        }

        const cachedStaff = staffSessionStorage.getSession();
        const isAdminEmail = fbUser.email?.startsWith('diblo.admin.');
        const resolvedStaffRole: 'Assistant' | 'Admin' =
          cachedStaff?.role ||
          (firestoreStaffData?.role === 'ADMIN' || isAdminEmail ? 'Admin' : 'Assistant');
        const resolvedEplId =
          cachedStaff?.eplId ||
          firestoreStaffData?.assistantId ||
          firestoreStaffData?.id ||
          'EPL001';
        const resolvedStaffName =
          cachedStaff?.name ||
          firestoreStaffData?.name ||
          fbUser.displayName ||
          (resolvedStaffRole === 'Admin' ? 'Admin' : 'Assistant');
        const resolvedStaffPhone =
          cachedStaff?.number || firestoreStaffData?.phone || '';
        const resolvedStaffEmail =
          cachedStaff?.email || firestoreStaffData?.email || fbUser.email || '';

        const restoredSession: StaffSession = {
          authenticated: true,
          eplId: resolvedEplId,
          name: resolvedStaffName,
          number: resolvedStaffPhone,
          email: resolvedStaffEmail,
          role: resolvedStaffRole
        };

        if (isMounted) {
          try {
            localStorage.setItem(LIVE_DEVICE_LOGIN_KEY, 'true');
          } catch {}
          setStaffUser(restoredSession);
          staffSessionStorage.setSession(restoredSession);
          const nextRole: UserRole = resolvedStaffRole === 'Admin' ? 'ADMIN' : 'ASSISTANT';
          setCurrentRole(nextRole);
          tokenStorage.setActiveRole(nextRole);
          setIsAuthLoading(false);
        }
      } else {
        if (!isStaffAuthAccount) {
          setFirebaseCustomer(null);
          let hasValidSavedCustomer = false;
          try {
            if (hasLiveDeviceLoginFlag()) {
              const saved = localStorage.getItem('diblo_customer_profile');
              if (saved) {
                const parsed = JSON.parse(saved);
                if (!isStaleDemoCustomer(parsed) && (parsed.phone || parsed.email)) {
                  hasValidSavedCustomer = true;
                  setCustomerProfile(mergeCustomerProfileSources([parsed], {
                    id: parsed.id || parsed.userId || 'cust-user',
                    userId: parsed.userId || parsed.id || 'cust-user',
                    name: parsed.name,
                    phone: parsed.phone,
                    email: parsed.email
                  }));
                }
              }
            }
          } catch {}
          if (!hasValidSavedCustomer) {
            setIsCustomerAuthenticated(false);
            setCustomerProfile(null);
          }
        }
        setIsAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  // Validate active staff session on mount and keep persisted device session intact
  useEffect(() => {
    let isMounted = true;
    async function verifySession() {
      const cached = staffSessionStorage.getSession();
      if (cached && cached.authenticated) {
        try {
          const verified = await api.getStaffSession();
          if (isMounted) {
            const updatedSession: StaffSession =
              verified.success && verified.authenticated && verified.role && verified.eplId
                ? {
                    authenticated: true,
                    eplId: verified.eplId,
                    name: verified.name || cached.name,
                    number: verified.number || cached.number,
                    email: verified.email || cached.email,
                    role: verified.role
                  }
                : cached;
            setStaffUser(updatedSession);
            staffSessionStorage.setSession(updatedSession);
            await ensureFirebaseAuthSession({
              id: updatedSession.eplId || updatedSession.number || 'asst-1',
              name: updatedSession.name,
              phone: updatedSession.number,
              role: updatedSession.role === 'Admin' ? 'ADMIN' : 'ASSISTANT',
              assistantId: updatedSession.eplId
            });
          }
        } catch {
          // Keep cached session if network check fails
        }
      }
    }
    verifySession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync profile data on role change
  useEffect(() => {
    let isMounted = true;
    async function loadActiveProfile() {
      try {
        if (currentRole === 'ASSISTANT') {
          const staffPhone = staffUser?.number || currentUser.phone;
          const staffId = staffUser?.eplId || assistantProfile?.id || `asst-${staffPhone || '1'}`;

          // 1. Load cached assistant profile from localStorage if available
          let cachedAsst: Partial<AssistantProfile> | null = null;
          try {
            const rawSpecific = localStorage.getItem(`diblo_assistant_profile_${staffId}`);
            const rawGeneral = localStorage.getItem('diblo_assistant_profile');
            const raw = rawSpecific || rawGeneral;
            if (raw) {
              cachedAsst = JSON.parse(raw);
            }
          } catch {}

          // 2. Load from Firestore if available
          let firestoreAsst: Partial<AssistantProfile> | null = null;
          if (db && staffId) {
            try {
              const snap = await getDoc(doc(db, 'assistants', staffId));
              if (snap.exists()) {
                firestoreAsst = snap.data() as Partial<AssistantProfile>;
              }
            } catch {}
          }

          if (staffPhone) {
            const asst = await api.getAssistant(staffPhone).catch(() => null);
            if (asst && !(asst as any).error && isMounted) {
              const mergedAsst: AssistantProfile = {
                ...asst,
                ...(cachedAsst || {}),
                ...(firestoreAsst || {}),
                photo:
                  firestoreAsst?.photo ||
                  cachedAsst?.photo ||
                  asst.photo ||
                  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
                documents:
                  (firestoreAsst?.documents && firestoreAsst.documents.length > 0
                    ? firestoreAsst.documents
                    : cachedAsst?.documents && cachedAsst.documents.length > 0
                    ? cachedAsst.documents
                    : asst.documents) || []
              };
              setAssistantProfile(mergedAsst);
            } else if (staffUser && isMounted) {
              const fallbackAsst: AssistantProfile = {
                ...DEFAULT_ASSISTANT_PROFILE,
                ...(cachedAsst || {}),
                ...(firestoreAsst || {}),
                id: staffUser.eplId || `asst-${staffPhone}`,
                userId: staffUser.eplId || `user-${staffPhone}`,
                name: firestoreAsst?.name || cachedAsst?.name || staffUser.name || 'Assistant',
                phone: staffPhone,
                photo:
                  firestoreAsst?.photo ||
                  cachedAsst?.photo ||
                  DEFAULT_ASSISTANT_PROFILE.photo ||
                  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
                documents:
                  (firestoreAsst?.documents && firestoreAsst.documents.length > 0
                    ? firestoreAsst.documents
                    : cachedAsst?.documents && cachedAsst.documents.length > 0
                    ? cachedAsst.documents
                    : DEFAULT_ASSISTANT_PROFILE.documents) || [],
                languages:
                  firestoreAsst?.languages ||
                  cachedAsst?.languages ||
                  ['Hindi', 'English', 'Marathi'],
                rating: firestoreAsst?.rating ?? cachedAsst?.rating ?? 5.0,
                verificationStatus: 'VERIFIED',
                policeVerified: true,
                isOnline: true,
                currentLocation: firestoreAsst?.currentLocation ||
                  cachedAsst?.currentLocation || {
                    lat: 19.0607,
                    lng: 72.8258,
                    address: 'Hill Road, Bandra West, Mumbai',
                    area: 'Bandra West, Mumbai',
                    lastUpdated: new Date().toISOString()
                  },
                serviceCapabilities:
                  firestoreAsst?.serviceCapabilities ||
                  cachedAsst?.serviceCapabilities ||
                  DEFAULT_ASSISTANT_PROFILE.serviceCapabilities,
                serviceArea:
                  firestoreAsst?.serviceArea ||
                  cachedAsst?.serviceArea ||
                  ['Bandra West', 'Khar', 'Santacruz', 'Andheri West']
              };
              setAssistantProfile(fallbackAsst);
            }
          }
        }
      } catch (err) {
        console.warn('[Diblo Profile] Sync notice:', err);
      }
    }
    loadActiveProfile();
    return () => {
      isMounted = false;
    };
  }, [currentRole, currentUser.phone, staffUser?.eplId]);

  const switchRole = async (newRole: UserRole) => {
    setCurrentRole(newRole);
    tokenStorage.setActiveRole(newRole);
    const userForRole = DEFAULT_USERS[newRole] || DEFAULT_USERS.CUSTOMER;
    setCurrentUser(userForRole);

    try {
      if (newRole === 'CUSTOMER') {
        if (customerProfile && !isStaleDemoCustomer(customerProfile)) {
          setCurrentUser({
            id: customerProfile.userId || customerProfile.id,
            name: customerProfile.name,
            phone: customerProfile.phone,
            email: customerProfile.email,
            role: 'CUSTOMER',
            avatar: customerProfile.avatar || '',
            createdAt: customerProfile.createdAt
          });
          await ensureFirebaseAuthSession({
            id: customerProfile.phone || customerProfile.id,
            name: customerProfile.name,
            phone: customerProfile.phone,
            role: 'CUSTOMER',
            customerId: customerProfile.id
          });
        }
      } else if (newRole === 'ASSISTANT') {
        const asst = await api.getAssistant(userForRole.phone).catch(() => null);
        if (asst && !(asst as any).error) setAssistantProfile(asst);
        await ensureFirebaseAuthSession({
          id: asst?.id || userForRole.id || 'asst-1',
          name: asst?.name || userForRole.name,
          phone: asst?.phone || userForRole.phone,
          role: 'ASSISTANT',
          assistantId: asst?.id || 'asst-1'
        });
      } else {
        await ensureFirebaseAuthSession({
          id: userForRole.id,
          name: userForRole.name,
          phone: userForRole.phone,
          role: newRole
        });
      }
    } catch {
      // Role switch fallback
    }
  };

  const updateCustomerProfile = (updated: Partial<CustomerProfile>) => {
    const baseProfile: CustomerProfile = customerProfile || {
      id: firebaseCustomer?.uid || currentUser?.id || 'cust-user',
      userId: firebaseCustomer?.uid || currentUser?.id || 'cust-user',
      name: currentUser?.name || firebaseCustomer?.displayName || 'Customer',
      phone: currentUser?.phone || firebaseCustomer?.phoneNumber || '',
      email: currentUser?.email || firebaseCustomer?.email || '',
      savedAddresses: [],
      emergencyContact: { name: '', phone: '', relationship: 'Family' },
      referralCode: 'DIBLO100',
      walletBalance: 100,
      createdAt: new Date().toISOString()
    };

    const resolvedName = updated.displayName ?? updated.name ?? baseProfile.name;
    const nowIso = new Date().toISOString();
    const rawMerged: CustomerProfile = {
      ...baseProfile,
      ...updated,
      name: resolvedName,
      displayName: resolvedName,
      updatedAt: nowIso
    };

    const completion = calculateCustomerProfileCompletion(rawMerged);
    const merged: CustomerProfile = {
      ...rawMerged,
      profileCompletion: completion,
      profileCompleted: completion === 100
    };

    setCustomerProfile(merged);
    setCurrentUser((prev) => ({
      ...prev,
      name: resolvedName || prev.name,
      email: merged.email || prev.email,
      phone: merged.phone || prev.phone,
      avatar: merged.avatar || prev.avatar
    }));

    try {
      localStorage.setItem(LIVE_DEVICE_LOGIN_KEY, 'true');
      localStorage.setItem('diblo_customer_profile', JSON.stringify(merged));
    } catch (err) {
      console.warn('Failed to save customer profile to localStorage:', err);
    }

    const authUid =
      auth?.currentUser?.uid ||
      firebaseCustomer?.uid ||
      merged.userId ||
      currentUser?.id ||
      merged.id;

    if (authUid && db) {
      const sanitizedPayload: Record<string, any> = {
        id: merged.id || authUid,
        uid: authUid,
        userId: authUid,
        customerId: merged.id || authUid,
        role: 'CUSTOMER',
        name: merged.name,
        displayName: merged.displayName || merged.name,
        phone: merged.phone || '',
        email: merged.email || '',
        avatar: merged.avatar || '',
        alternatePhone: merged.alternatePhone || '',
        gender: merged.gender || '',
        dob: merged.dob || '',
        preferredLanguage: merged.preferredLanguage || 'English',
        bloodGroup: merged.bloodGroup || '',
        specialInstructions: merged.specialInstructions || '',
        savedAddresses: merged.savedAddresses || [],
        emergencyContact: merged.emergencyContact || { name: '', phone: '', relationship: 'Family' },
        favoriteAssistantIds: merged.favoriteAssistantIds || [],
        referralCode: merged.referralCode || 'DIBLO100',
        walletBalance: merged.walletBalance ?? 100,
        profileCompletion: merged.profileCompletion ?? completion,
        profileCompleted: Boolean(merged.profileCompleted),
        updatedAt: nowIso
      };
      if (merged.contactPreferences) {
        sanitizedPayload.contactPreferences = merged.contactPreferences;
      }
      if (Array.isArray(merged.mandatoryDocuments)) {
        sanitizedPayload.mandatoryDocuments = merged.mandatoryDocuments;
        sanitizedPayload.documents = merged.mandatoryDocuments;
      } else if (Array.isArray(merged.documents)) {
        sanitizedPayload.documents = merged.documents;
        sanitizedPayload.mandatoryDocuments = merged.documents;
      }

      (async () => {
        let targetUid = auth?.currentUser?.uid || authUid;
        if (!auth?.currentUser?.uid) {
          const ensured = await ensureFirebaseAuthSession({
            id: merged.phone || merged.id || authUid,
            name: merged.name,
            phone: merged.phone,
            role: 'CUSTOMER',
            customerId: merged.id
          });
          if (ensured) targetUid = ensured;
        }
        if (!auth?.currentUser?.uid && !(setDoc as any)?.mock) return;

        setDoc(doc(db, 'users', targetUid), sanitizedPayload, { merge: true }).catch((error) => {
          console.debug('[AuthContext] Firestore user profile sync notice:', error?.message || error);
        });

        const custDocId = merged.id || targetUid;
        setDoc(doc(db, 'customers', custDocId), sanitizedPayload, { merge: true }).catch(() => {});
        if (custDocId !== targetUid) {
          setDoc(doc(db, 'customers', targetUid), sanitizedPayload, { merge: true }).catch(() => {});
        }
      })();
    }

    if (merged.id || merged.phone) {
      api.updateCustomer(merged.id || `cust-${merged.phone}`, merged).catch(() => {});
    }
  };

  const updateAssistantProfile = (updated: Partial<AssistantProfile>) => {
    const baseProfile: AssistantProfile = assistantProfile || {
      ...DEFAULT_ASSISTANT_PROFILE,
      id: staffUser?.eplId || DEFAULT_ASSISTANT_PROFILE.id,
      userId: staffUser?.eplId || DEFAULT_ASSISTANT_PROFILE.userId,
      name: staffUser?.name || DEFAULT_ASSISTANT_PROFILE.name,
      phone: staffUser?.number || DEFAULT_ASSISTANT_PROFILE.phone
    };

    const merged: AssistantProfile = {
      ...baseProfile,
      ...updated
    };

    setAssistantProfile(merged);

    try {
      localStorage.setItem('diblo_assistant_profile', JSON.stringify(merged));
      if (merged.id) {
        localStorage.setItem(`diblo_assistant_profile_${merged.id}`, JSON.stringify(merged));
      }
    } catch (err) {
      console.warn('Failed to save assistant profile to localStorage:', err);
    }

    if (db && merged.id) {
      setDoc(
        doc(db, 'assistants', merged.id),
        {
          ...merged,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      ).catch(() => {});
    }

    if (merged.id) {
      api.updateAssistant(merged.id, merged).catch(() => {});
    }
  };

  // Customer's Favorite / Saved Assistants
  const favoriteAssistantIds: string[] = customerProfile?.favoriteAssistantIds || [];

  const isAssistantFavorited = (assistantId: string): boolean => {
    return favoriteAssistantIds.includes(assistantId);
  };

  const toggleFavoriteAssistant = async (assistantId: string): Promise<boolean> => {
    const isCurrentlyFav = favoriteAssistantIds.includes(assistantId);
    const updated = isCurrentlyFav
      ? favoriteAssistantIds.filter((id) => id !== assistantId)
      : [...favoriteAssistantIds, assistantId];

    if (customerProfile) {
      updateCustomerProfile({ favoriteAssistantIds: updated });
    }

    try {
      localStorage.setItem('diblo_customer_favorites', JSON.stringify(updated));
    } catch {}

    // Synchronize to backend if customer ID exists
    const custId = customerProfile?.id;
    if (custId) {
      try {
        api.toggleFavoriteAssistant(custId, assistantId, !isCurrentlyFav);
      } catch (e) {
        console.warn('Failed to sync favorite assistant with server', e);
      }
    }

    return !isCurrentlyFav;
  };

  // Staff Login using Mobile Number and Password verified against Google Sheet
  const loginStaff = async (mobileNumber: string, password: string) => {
    const res = await api.loginStaff(mobileNumber, password);
    if (res.success && res.role) {
      const session: StaffSession = {
        authenticated: true,
        eplId: res.eplId || 'EPL001',
        name: res.name || (res.role === 'Admin' ? 'Admin' : 'Assistant'),
        number: res.number || mobileNumber,
        email: res.email || '',
        role: res.role
      };
      try {
        localStorage.setItem(LIVE_DEVICE_LOGIN_KEY, 'true');
      } catch {}
      setStaffUser(session);
      staffSessionStorage.setSession(session);

      // Align active user & role
      if (res.role === 'Admin') {
        setCurrentRole('ADMIN');
        setCurrentUser({
          ...DEFAULT_USERS.ADMIN,
          name: session.name,
          phone: session.number || DEFAULT_USERS.ADMIN.phone
        });
        await ensureFirebaseAuthSession({
          id: session.eplId,
          name: session.name,
          phone: session.number,
          role: 'ADMIN'
        });
      } else {
        setCurrentRole('ASSISTANT');
        setCurrentUser({
          ...DEFAULT_USERS.ASSISTANT,
          name: session.name,
          phone: session.number || DEFAULT_USERS.ASSISTANT.phone
        });
        await ensureFirebaseAuthSession({
          id: session.eplId || session.number || 'asst-1',
          name: session.name,
          phone: session.number,
          role: 'ASSISTANT',
          assistantId: session.eplId || 'asst-1'
        });
      }
    }
    return res;
  };

  // Staff Logout: clears session and redirects to / (Login screen)
  const logoutStaff = async () => {
    await api.logoutStaff();
    try {
      await signOut(auth);
    } catch {
      // Non-fatal
    }
    try {
      localStorage.removeItem(LIVE_DEVICE_LOGIN_KEY);
    } catch {}
    setStaffUser(null);
    staffSessionStorage.clear();
    tokenStorage.clear();
    setCurrentRole('CUSTOMER');
    setCurrentUser(DEFAULT_USERS.CUSTOMER);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Customer Logout: clears Firebase session and customer state, redirects to /customer-login
  const logoutCustomer = async () => {
    clearActiveRecaptchaVerifier();
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('[Diblo Auth] Firebase signOut notice:', err);
    }
    try {
      localStorage.removeItem(LIVE_DEVICE_LOGIN_KEY);
      localStorage.removeItem('diblo_customer_profile');
      tokenStorage.clear();
    } catch {}
    setFirebaseCustomer(null);
    setIsCustomerAuthenticated(false);
    setCustomerProfile(null);
    setCurrentUser(DEFAULT_USERS.CUSTOMER);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/customer-login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Sync Firebase authenticated Customer with local profile & store full profile in Firebase Firestore
  const syncFirebaseCustomer = async (
    fbUser: FirebaseUser,
    extra?: { phone?: string; name?: string; email?: string; isNewUser?: boolean }
  ): Promise<CustomerProfile | null> => {
    try {
      localStorage.setItem(LIVE_DEVICE_LOGIN_KEY, 'true');
    } catch {}
    setFirebaseCustomer(fbUser);
    setIsCustomerAuthenticated(true);

    const cust = await loadAndSyncCustomerProfile(fbUser, extra);

    setCustomerProfile(cust);
    setCurrentRole('CUSTOMER');
    tokenStorage.setActiveRole('CUSTOMER');
    setCurrentUser({
      id: fbUser.uid,
      name: cust.name || 'Customer',
      phone: cust.phone || '',
      email: cust.email || '',
      role: 'CUSTOMER',
      avatar: cust.avatar || fbUser.photoURL || '',
      createdAt: fbUser.metadata?.creationTime || cust.createdAt || new Date().toISOString()
    });
    setIsAuthLoading(false);
    return cust;
  };

  // Sync Customer by verified phone (handles direct backend OTP verification and preserves Firebase auth state)
  const syncCustomerByPhone = async (phone: string, name?: string) => {
    try {
      localStorage.setItem(LIVE_DEVICE_LOGIN_KEY, 'true');
    } catch {}
    const cleanPhone = phone.replace('+91', '').replace(/\D/g, '').slice(-10);
    const custId = `cust-${cleanPhone}`;
    const displayName = name || `Customer ${cleanPhone.slice(-4)}`;

    await ensureFirebaseAuthSession({
      id: cleanPhone,
      name: displayName,
      phone: cleanPhone,
      role: 'CUSTOMER',
      customerId: custId
    });

    if (auth.currentUser) {
      await syncFirebaseCustomer(auth.currentUser, { phone: cleanPhone, name });
      return;
    }

    setIsCustomerAuthenticated(true);
    let cust: CustomerProfile | null = null;
    if (cleanPhone) {
      const fetched = await api.getCustomer(cleanPhone).catch(() => null);
      if (fetched && !(fetched as any).error && !isStaleDemoCustomer(fetched)) {
        cust = fetched;
      }
      if (!cust) {
        cust = await api.createCustomerProfile({
          id: custId,
          userId: `user-c-${cleanPhone}`,
          name: displayName,
          phone: cleanPhone,
          email: '',
          walletBalance: 100
        }).catch(() => null);
      }
    }

    const merged = mergeCustomerProfileSources([cust], {
      id: custId,
      userId: `user-c-${cleanPhone}`,
      name: displayName,
      phone: cleanPhone,
      email: cust?.email || ''
    });

    setCustomerProfile(merged);
    try {
      localStorage.setItem('diblo_customer_profile', JSON.stringify(merged));
    } catch {}
    setCurrentRole('CUSTOMER');
    setCurrentUser({
      id: `user-c-${cleanPhone}`,
      name: merged.name || displayName,
      phone: cleanPhone,
      email: merged.email || '',
      role: 'CUSTOMER',
      avatar: merged.avatar || '',
      createdAt: new Date().toISOString()
    });
    setIsAuthLoading(false);
  };

  const logout = async () => {
    if (currentRole === 'CUSTOMER') {
      await logoutCustomer();
    } else {
      await logoutStaff();
    }
  };

  const loginWithPhoneOtp = async (phone: string, otp: string, role: UserRole = 'CUSTOMER', name?: string) => {
    try {
      const res = await api.verifyOtp(phone, otp, role, name);
      if (res.success) {
        await syncCustomerByPhone(phone, name || res.user?.name);
        return { success: true };
      }
      return { success: false, error: res.error || 'Invalid or expired verification code' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Verification failed. Please try again.' };
    }
  };

  // Customer Email or Mobile + Password Authentication (Logs in existing customer OR registers new customer seamlessly)
  const loginWithEmailPassword = async (
    identifier: string,
    pass: string,
    _role: UserRole = 'CUSTOMER',
    name?: string,
    isSignUp = false
  ): Promise<{
    success: boolean;
    isNewCustomer?: boolean;
    profileCompleted?: boolean;
    error?: string;
    code?: string;
  }> => {
    const rawId = String(identifier || '').trim();
    const cleanPass = String(pass || '').trim();

    if (!rawId) {
      return { success: false, error: 'Please enter your email address or 10-digit mobile number.' };
    }
    if (!cleanPass || cleanPass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const isEmailInput = rawId.includes('@');
    let firebaseEmail = '';
    let cleanPhone = '';
    let cleanRealEmail = '';

    if (isEmailInput) {
      cleanRealEmail = rawId.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanRealEmail)) {
        return { success: false, error: 'Please enter a valid email address.' };
      }
      firebaseEmail = cleanRealEmail;
    } else {
      const digits = rawId.replace(/\D/g, '');
      const normalized =
        digits.length === 12 && digits.startsWith('91')
          ? digits.slice(2)
          : digits.length === 11 && digits.startsWith('0')
          ? digits.slice(1)
          : digits.slice(0, 10);
      if (!/^[6-9]\d{9}$/.test(normalized)) {
        return {
          success: false,
          error: 'Please enter a valid email address or 10-digit Indian mobile number.'
        };
      }
      cleanPhone = normalized;
      firebaseEmail = `diblo.customer.${cleanPhone}@diblo-39440.firebaseapp.com`;
    }

    try {
      if (auth && typeof setPersistence === 'function' && browserLocalPersistence) {
        await setPersistence(auth, browserLocalPersistence).catch(() => {});
      }

      if (isSignUp) {
        try {
          const newCred = await createUserWithEmailAndPassword(auth, firebaseEmail, cleanPass);
          if (name && name.trim() && newCred.user) {
            await updateProfile(newCred.user, { displayName: name.trim() }).catch(() => {});
          }
          const synced = await syncFirebaseCustomer(newCred.user, {
            phone: cleanPhone || undefined,
            email: cleanRealEmail || undefined,
            name: name?.trim() || undefined,
            isNewUser: true
          });
          return {
            success: true,
            isNewCustomer: true,
            profileCompleted: Boolean(synced?.profileCompleted)
          };
        } catch (signUpErr: any) {
          const errCode = String(signUpErr?.code || '').toLowerCase();
          if (errCode.includes('email-already-in-use')) {
            // Already registered -> attempt normal login with provided password
            try {
              const existingCred = await signInWithEmailAndPassword(auth, firebaseEmail, cleanPass);
              const synced = await syncFirebaseCustomer(existingCred.user, {
                phone: cleanPhone || undefined,
                email: cleanRealEmail || undefined,
                name: name?.trim() || undefined
              });
              return {
                success: true,
                isNewCustomer: false,
                profileCompleted: Boolean(synced?.profileCompleted)
              };
            } catch {
              return {
                success: false,
                code: 'ACCOUNT_EXISTS',
                error: 'An account with this email/mobile already exists. Please enter your existing password to log in.'
              };
            }
          }
          return {
            success: false,
            error: signUpErr?.message || 'Unable to create account. Please try again.'
          };
        }
      }

      // Standard flow: 1. Try signing in existing registered customer
      try {
        const cred = await signInWithEmailAndPassword(auth, firebaseEmail, cleanPass);
        const synced = await syncFirebaseCustomer(cred.user, {
          phone: cleanPhone || undefined,
          email: cleanRealEmail || undefined,
          name: name?.trim() || undefined
        });
        return {
          success: true,
          isNewCustomer: false,
          profileCompleted: Boolean(synced?.profileCompleted)
        };
      } catch (signInErr: any) {
        const signInCode = String(signInErr?.code || '').toLowerCase();
        if (signInCode.includes('too-many-requests')) {
          return {
            success: false,
            error: 'Too many login attempts. Please wait a moment and try again.'
          };
        }
        if (signInCode.includes('wrong-password')) {
          return {
            success: false,
            code: 'WRONG_PASSWORD',
            error: 'Incorrect password for this account. Please try again.'
          };
        }

        // 2. If email/mobile is NOT registered yet, proceed with registration automatically
        try {
          const newCred = await createUserWithEmailAndPassword(auth, firebaseEmail, cleanPass);
          if (name && name.trim() && newCred.user) {
            await updateProfile(newCred.user, { displayName: name.trim() }).catch(() => {});
          }
          const synced = await syncFirebaseCustomer(newCred.user, {
            phone: cleanPhone || undefined,
            email: cleanRealEmail || undefined,
            name: name?.trim() || undefined,
            isNewUser: true
          });
          return {
            success: true,
            isNewCustomer: true,
            profileCompleted: Boolean(synced?.profileCompleted)
          };
        } catch (createErr: any) {
          const createCode = String(createErr?.code || '').toLowerCase();
          if (createCode.includes('email-already-in-use')) {
            return {
              success: false,
              code: 'WRONG_PASSWORD',
              error: 'Incorrect password for this registered account. Please check your password and try again.'
            };
          }
          return {
            success: false,
            error: 'Unable to sign in or register with these credentials. Please check your details and try again.'
          };
        }
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Authentication service error. Please try again.'
      };
    }
  };
  const loginDemoUser = async () => ({ success: true });

  // 15-Minute Inactivity / Idle Timer: automatically logs out the customer after 15 minutes of inactivity
  useIdleTimer({
    timeoutMs: DEFAULT_IDLE_TIMEOUT_MS,
    enabled: isCustomerAuthenticated,
    onIdle: () => {
      logoutCustomer();
    }
  });

  const customerProfileCompletion = calculateCustomerProfileCompletion(customerProfile);
  const isCustomerProfileComplete = Boolean(
    customerProfile?.profileCompleted && customerProfileCompletion === 100
  ) || customerProfileCompletion === 100;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        customerProfile,
        customerProfileCompletion,
        isCustomerProfileComplete,
        assistantProfile,
        staffUser,
        isAuthenticated: isCustomerAuthenticated || Boolean(staffUser?.authenticated),
        isCustomerAuthenticated,
        isAuthLoading,
        firebaseCustomer,
        isLoading: false,
        isFirebaseLive: isFirebaseConfigured(),
        switchRole,
        updateCustomerProfile,
        updateAssistantProfile,
        favoriteAssistantIds,
        toggleFavoriteAssistant,
        isAssistantFavorited,
        loginStaff,
        logoutStaff,
        logoutCustomer,
        logout,
        syncFirebaseCustomer,
        syncCustomerByPhone,
        loginWithPhoneOtp,
        loginWithEmailPassword,
        loginDemoUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    const fbUser = auth?.currentUser ?? null;
    const fallbackUid = fbUser?.uid || '';
    const fallbackName = fbUser?.displayName || 'Customer';
    const fallbackPhone = fbUser?.phoneNumber || '';
    const fallbackEmail = fbUser?.email || '';
    return {
      currentUser: {
        ...DEFAULT_USERS.CUSTOMER,
        id: fallbackUid,
        name: fallbackName,
        phone: fallbackPhone,
        email: fallbackEmail
      },
      currentRole: 'CUSTOMER',
      customerProfile: fallbackUid
        ? {
            id: fallbackUid,
            userId: fallbackUid,
            name: fallbackName,
            displayName: fallbackName,
            phone: fallbackPhone,
            email: fallbackEmail,
            savedAddresses: [],
            emergencyContact: { name: '', phone: '', relationship: '' },
            referralCode: 'DIBLO100',
            walletBalance: 350,
            createdAt: new Date().toISOString()
          }
        : null,
      customerProfileCompletion: 0,
      isCustomerProfileComplete: false,
      assistantProfile: DEFAULT_ASSISTANT_PROFILE,
      staffUser: null,
      isAuthenticated: Boolean(fbUser),
      isCustomerAuthenticated: Boolean(fbUser),
      isAuthLoading: false,
      firebaseCustomer: fbUser,
      isLoading: false,
      isFirebaseLive: isFirebaseConfigured(),
      switchRole: async () => {},
      updateCustomerProfile: () => {},
      updateAssistantProfile: () => {},
      favoriteAssistantIds: [],
      toggleFavoriteAssistant: async () => false,
      isAssistantFavorited: () => false,
      loginStaff: async () => ({ success: false }),
      logoutStaff: async () => {},
      logoutCustomer: async () => {},
      logout: async () => {},
      syncFirebaseCustomer: async () => null,
      syncCustomerByPhone: async () => {},
      loginWithPhoneOtp: async () => ({ success: true }),
      loginWithEmailPassword: async () => ({ success: true }),
      loginDemoUser: async () => ({ success: true })
    };
  }
  return context;
};
