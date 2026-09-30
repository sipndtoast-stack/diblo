import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
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
  if (obj.phone === '9820123456' || obj.phone === '9820554433') return true;
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
    /^customer\s+\d{4}$/i.test(rawName);
  if (!isPlaceholderName) {
    score += 20;
  }

  const cleanPhone = String(profile.phone || '').replace(/\D/g, '').slice(-10);
  if (/^[6-9]\d{9}$/.test(cleanPhone)) {
    score += 15;
  }

  const rawEmail = String(profile.email || '').trim().toLowerCase();
  const isPlaceholderEmail =
    !rawEmail ||
    !rawEmail.includes('@') ||
    rawEmail.endsWith('@diblo.in') ||
    rawEmail.endsWith('@diblo-39440.firebaseapp.com');
  if (!isPlaceholderEmail) {
    score += 15;
  }

  if (profile.avatar && String(profile.avatar).trim().length > 0) {
    score += 15;
  }

  if (Array.isArray(profile.savedAddresses) && profile.savedAddresses.length > 0) {
    score += 15;
  }

  if (
    profile.emergencyContact &&
    String(profile.emergencyContact.name || '').trim().length > 0 &&
    String(profile.emergencyContact.phone || '').trim().length > 0
  ) {
    score += 10;
  }

  if (profile.specialInstructions && String(profile.specialInstructions).trim().length > 0) {
    score += 10;
  }

  return Math.min(score, 100);
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
  syncFirebaseCustomer: (user: FirebaseUser) => Promise<void>;
  syncCustomerByPhone?: (phone: string, name?: string) => Promise<void>;
  loginWithPhoneOtp?: (phone: string, otp: string, role?: UserRole, name?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithEmailPassword?: (
    email: string,
    pass: string,
    role?: UserRole,
    name?: string,
    isSignUp?: boolean
  ) => Promise<{ success: boolean }>;
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
  const [firebaseCustomer, setFirebaseCustomer] = useState<FirebaseUser | null>(() =>
    hasLiveDeviceLoginFlag() ? auth.currentUser : null
  );
  const [isCustomerAuthenticated, setIsCustomerAuthenticated] = useState<boolean>(() => {
    if (!hasLiveDeviceLoginFlag()) return false;
    try {
      const saved = localStorage.getItem('diblo_customer_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!isStaleDemoCustomer(parsed) && (parsed.phone || parsed.email)) return true;
      }
    } catch {}
    return Boolean(
      auth.currentUser &&
        !isSyntheticPlaceholderEmail(auth.currentUser.email) &&
        !auth.currentUser.email?.startsWith('diblo.assistant.') &&
        !auth.currentUser.email?.startsWith('diblo.admin.') &&
        !auth.currentUser.email?.startsWith('diblo.operations.')
    );
  });
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Restore Firebase Authentication for Customer or Assistant/Admin automatically on device load
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMounted) return;

      const isMockedTestEnv = Boolean((onAuthStateChanged as any)?.mock);
      if (fbUser && (!hasLiveDeviceLoginFlag() && !isMockedTestEnv || isSyntheticPlaceholderEmail(fbUser.email))) {
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

        // Check Firestore users/{uid} for stored phone/email on this device
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

        const rawPhone = fbUser.phoneNumber || firestoreUserData?.phone || '';
        const emailMatch = fbUser.email?.match(/^diblo\.customer\.(\d{10})@/);
        const cleanPhone =
          rawPhone.replace('+91', '').replace(/\D/g, '').slice(-10) ||
          (emailMatch ? emailMatch[1] : '') ||
          customerProfile?.phone ||
          '';
        const resolvedEmail =
          fbUser.email ||
          firestoreUserData?.email ||
          customerProfile?.email ||
          (cleanPhone ? `${cleanPhone}@diblo.in` : '');
        const resolvedName =
          firestoreUserData?.name ||
          fbUser.displayName ||
          customerProfile?.name ||
          (cleanPhone ? `Customer ${cleanPhone.slice(-4)}` : 'Customer');

        let cust: CustomerProfile | null = null;
        if (cleanPhone) {
          cust = await api.getCustomer(cleanPhone).catch(() => null);
          if (cust && isStaleDemoCustomer(cust)) cust = null;
          if (!cust) {
            cust = await api.createCustomerProfile({
              id: `cust-${cleanPhone}`,
              userId: fbUser.uid,
              name: resolvedName,
              phone: cleanPhone,
              email: resolvedEmail,
              walletBalance: 100
            }).catch(() => null);
          }
        }

        if (!cust && (cleanPhone || resolvedEmail)) {
          cust = {
            id: cleanPhone ? `cust-${cleanPhone}` : fbUser.uid,
            userId: fbUser.uid,
            name: resolvedName,
            displayName: resolvedName,
            phone: cleanPhone,
            email: resolvedEmail,
            savedAddresses: customerProfile?.savedAddresses || [],
            emergencyContact: customerProfile?.emergencyContact || { name: '', phone: '', relationship: 'Family' },
            referralCode: customerProfile?.referralCode || 'DIBLO100',
            walletBalance: customerProfile?.walletBalance ?? 100,
            createdAt: fbUser.metadata?.creationTime || new Date().toISOString()
          };
        }

        // Persist phone & email in Firestore users/{uid} so Firebase always has this user's record
        try {
          if (db && typeof setDoc === 'function') {
            await setDoc(
              doc(db, 'users', fbUser.uid),
              {
                id: fbUser.uid,
                uid: fbUser.uid,
                name: cust?.name || resolvedName,
                phone: cleanPhone || cust?.phone || '',
                email: cust?.email || resolvedEmail || '',
                role: 'CUSTOMER',
                customerId: cust?.id || `cust-${cleanPhone || fbUser.uid}`,
                updatedAt: new Date().toISOString()
              },
              { merge: true }
            );
          }
        } catch {
          // Non-fatal
        }

        if (isMounted) {
          if (cust && !isStaleDemoCustomer(cust)) {
            setCustomerProfile(cust);
            try {
              localStorage.setItem('diblo_customer_profile', JSON.stringify(cust));
            } catch {}
          }
          if (currentRole === 'CUSTOMER') {
            setCurrentUser({
              id: fbUser.uid,
              name: cust?.name || resolvedName,
              phone: cleanPhone || cust?.phone || customerProfile?.phone || '',
              email: cust?.email || resolvedEmail || customerProfile?.email || '',
              role: 'CUSTOMER',
              avatar: fbUser.photoURL || cust?.avatar || '',
              createdAt: fbUser.metadata?.creationTime || new Date().toISOString()
            });
          }
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
            const saved = localStorage.getItem('diblo_customer_profile');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (!isStaleDemoCustomer(parsed) && (parsed.phone || parsed.email)) {
                hasValidSavedCustomer = true;
              }
            }
          } catch {}
          if (!hasValidSavedCustomer) {
            setIsCustomerAuthenticated(false);
          }
        }
        setIsAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentRole]);

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
        if (currentRole === 'CUSTOMER') {
          if (currentUser.phone && currentUser.phone !== '9820123456') {
            const cust = await api.getCustomer(currentUser.phone).catch(() => null);
            if (cust && !isStaleDemoCustomer(cust) && isMounted) {
              setCustomerProfile(cust);
            }
          }
        } else if (currentRole === 'ASSISTANT') {
          const staffPhone = staffUser?.number || currentUser.phone;
          if (staffPhone) {
            const asst = await api.getAssistant(staffPhone).catch(() => null);
            if (asst && isMounted) {
              setAssistantProfile(asst);
            } else if (staffUser && isMounted) {
              setAssistantProfile({
                id: staffUser.eplId || `asst-${staffPhone}`,
                userId: staffUser.eplId || `user-${staffPhone}`,
                name: staffUser.name || 'Assistant',
                phone: staffPhone,
                photo: '',
                bio: 'Verified Diblo Personal Assistant',
                languages: ['Hindi', 'English', 'Marathi'],
                experienceYears: 2,
                rating: 5.0,
                totalReviews: 0,
                completedBookings: 0,
                verificationStatus: 'VERIFIED',
                policeVerified: true,
                aadhaarVerified: true,
                addressVerified: true,
                availability: 'ONLINE',
                isOnline: true,
                currentLocation: {
                  lat: 19.0607,
                  lng: 72.8258,
                  address: 'Mumbai',
                  area: 'Mumbai',
                  lastUpdated: new Date().toISOString()
                },
                serviceCapabilities: [],
                serviceArea: ['Mumbai'],
                earningsToday: 0,
                earningsWeek: 0,
                earningsMonth: 0,
                pendingPayout: 0,
                IncentivesEarned: 0
              });
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
  }, [currentRole, currentUser.phone]);

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
        if (asst) setAssistantProfile(asst);
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
    const merged: CustomerProfile = {
      ...baseProfile,
      ...updated,
      name: resolvedName,
      displayName: resolvedName
    };

    setCustomerProfile(merged);
    setCurrentUser((prev) => ({
      ...prev,
      name: resolvedName || prev.name,
      email: updated.email ?? prev.email,
      phone: updated.phone ?? prev.phone,
      avatar: updated.avatar ?? prev.avatar
    }));

    try {
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
        uid: authUid,
        userId: authUid,
        name: merged.name,
        displayName: merged.displayName || merged.name,
        phone: merged.phone || '',
        email: merged.email || '',
        preferredLanguage: merged.preferredLanguage || 'English',
        updatedAt: new Date().toISOString()
      };
      if (merged.contactPreferences) {
        sanitizedPayload.contactPreferences = merged.contactPreferences;
      }
      if (merged.alternatePhone !== undefined) {
        sanitizedPayload.alternatePhone = merged.alternatePhone;
      }
      if (merged.specialInstructions !== undefined) {
        sanitizedPayload.specialInstructions = merged.specialInstructions;
      }
      if (merged.emergencyContact) {
        sanitizedPayload.emergencyContact = merged.emergencyContact;
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
      })();
    }
  };

  const updateAssistantProfile = (updated: Partial<AssistantProfile>) => {
    if (assistantProfile) {
      setAssistantProfile({ ...assistantProfile, ...updated });
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

  // Sync Firebase authenticated Customer with local profile & store phone/email in Firebase Firestore
  const syncFirebaseCustomer = async (fbUser: FirebaseUser) => {
    try {
      localStorage.setItem(LIVE_DEVICE_LOGIN_KEY, 'true');
    } catch {}
    setFirebaseCustomer(fbUser);
    setIsCustomerAuthenticated(true);
    const rawPhone = fbUser.phoneNumber || '';
    const cleanPhone = rawPhone.replace('+91', '').replace(/\D/g, '').slice(-10);
    const resolvedEmail = fbUser.email || (cleanPhone ? `${cleanPhone}@diblo.in` : '');
    const resolvedName = fbUser.displayName || (cleanPhone ? `Customer ${cleanPhone.slice(-4)}` : 'Customer');

    let cust: CustomerProfile | null = null;
    if (cleanPhone) {
      cust = await api.getCustomer(cleanPhone).catch(() => null);
      if (cust && isStaleDemoCustomer(cust)) cust = null;
      if (!cust) {
        cust = await api.createCustomerProfile({
          id: `cust-${cleanPhone}`,
          userId: fbUser.uid,
          name: resolvedName,
          phone: cleanPhone,
          email: resolvedEmail,
          walletBalance: 100
        }).catch(() => null);
      }
    }

    if (!cust && (cleanPhone || resolvedEmail)) {
      cust = {
        id: cleanPhone ? `cust-${cleanPhone}` : fbUser.uid,
        userId: fbUser.uid,
        name: resolvedName,
        displayName: resolvedName,
        phone: cleanPhone,
        email: resolvedEmail,
        savedAddresses: [],
        emergencyContact: { name: '', phone: '', relationship: 'Family' },
        referralCode: 'DIBLO100',
        walletBalance: 100,
        createdAt: fbUser.metadata?.creationTime || new Date().toISOString()
      };
    }

    // Store customer phone number and email ID in Firebase Firestore so they remain persisted
    try {
      if (db && typeof setDoc === 'function') {
        const userPayload = {
          id: fbUser.uid,
          uid: fbUser.uid,
          userId: fbUser.uid,
          name: cust?.name || resolvedName,
          displayName: cust?.name || resolvedName,
          phone: cleanPhone || cust?.phone || '',
          email: cust?.email || resolvedEmail || '',
          role: 'CUSTOMER',
          customerId: cust?.id || (cleanPhone ? `cust-${cleanPhone}` : fbUser.uid),
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', fbUser.uid), userPayload, { merge: true });
        await setDoc(
          doc(db, 'customers', cust?.id || (cleanPhone ? `cust-${cleanPhone}` : fbUser.uid)),
          userPayload,
          { merge: true }
        );
      }
    } catch {
      // Non-fatal
    }

    if (cust && !isStaleDemoCustomer(cust)) {
      setCustomerProfile(cust);
      try {
        localStorage.setItem('diblo_customer_profile', JSON.stringify(cust));
      } catch {}
    }
    setCurrentRole('CUSTOMER');
    tokenStorage.setActiveRole('CUSTOMER');
    setCurrentUser({
      id: fbUser.uid,
      name: cust?.name || resolvedName,
      phone: cleanPhone || cust?.phone || '',
      email: cust?.email || resolvedEmail,
      role: 'CUSTOMER',
      avatar: fbUser.photoURL || cust?.avatar || '',
      createdAt: fbUser.metadata?.creationTime || new Date().toISOString()
    });
  };

  // Sync Customer by verified phone (handles direct backend OTP verification and preserves Firebase auth state)
  const syncCustomerByPhone = async (phone: string, name?: string) => {
    try {
      localStorage.setItem(LIVE_DEVICE_LOGIN_KEY, 'true');
    } catch {}
    const cleanPhone = phone.replace('+91', '').replace(/\D/g, '').slice(-10);
    const custId = `cust-${cleanPhone}`;
    const displayName = name || `Customer ${cleanPhone.slice(-4)}`;

    const fbUid = await ensureFirebaseAuthSession({
      id: cleanPhone,
      name: displayName,
      phone: cleanPhone,
      role: 'CUSTOMER',
      customerId: custId
    });

    if (auth.currentUser) {
      setFirebaseCustomer(auth.currentUser);
    }

    setIsCustomerAuthenticated(true);
    let cust: CustomerProfile | null = null;
    if (cleanPhone) {
      cust = await api.getCustomer(cleanPhone).catch(() => null);
      if (cust && isStaleDemoCustomer(cust)) cust = null;
      if (!cust) {
        cust = await api.createCustomerProfile({
          id: custId,
          userId: fbUid || `user-c-${cleanPhone}`,
          name: displayName,
          phone: cleanPhone,
          email: `${cleanPhone}@diblo.in`,
          walletBalance: 100
        }).catch(() => null);
      }
    }

    if (cust && !isStaleDemoCustomer(cust)) {
      setCustomerProfile(cust);
      try {
        localStorage.setItem('diblo_customer_profile', JSON.stringify(cust));
      } catch {}
    }
    setCurrentRole('CUSTOMER');
    setCurrentUser({
      id: fbUid || `user-c-${cleanPhone}`,
      name: cust?.name || displayName,
      phone: cleanPhone,
      email: cust?.email || `${cleanPhone}@diblo.in`,
      role: 'CUSTOMER',
      avatar: cust?.avatar || '',
      createdAt: new Date().toISOString()
    });
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
  const loginWithEmailPassword = async () => ({ success: true });
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
  const isCustomerProfileComplete = customerProfileCompletion === 100;

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
      syncFirebaseCustomer: async () => {},
      syncCustomerByPhone: async () => {},
      loginWithPhoneOtp: async () => ({ success: true }),
      loginWithEmailPassword: async () => ({ success: true }),
      loginDemoUser: async () => ({ success: true })
    };
  }
  return context;
};
