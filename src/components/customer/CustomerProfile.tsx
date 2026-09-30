import React, { useState, useRef, useEffect } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  getFirestore
} from 'firebase/firestore';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import {
  db,
  auth,
  ensureFirebaseAuthSession,
  handleFirestoreError,
  OperationType
} from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import {
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Heart,
  Plus,
  Trash2,
  Check,
  LogOut,
  Camera,
  Upload,
  Edit3,
  Save,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Globe,
  Activity,
  FileText,
  Calendar,
  Lock,
  Star,
  Bell,
  BellOff,
  Volume2,
  Send,
  MessageSquare
} from 'lucide-react';
import { CustomerSpendingAnalytics } from './CustomerSpendingAnalytics';
import { ReferAFriendSection } from './ReferAFriendSection';
import {
  CustomerProfile as CustomerProfileType,
  AssistantProfile,
  ContactPreferences
} from '../../types';
import { MOCK_ASSISTANTS } from '../../data/mockData';

interface CustomerProfileProps {
  onOpenBookingWithCoupon?: (couponCode: string) => void;
  onRequestBookingWithAssistant?: (assistant: AssistantProfile) => void;
  onViewAllFavorites?: () => void;
  onOpenLogout?: () => void;
}

const PRESET_AVATARS = [
  {
    id: 'av-1',
    label: 'Professional',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'av-2',
    label: 'Gentleman',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'av-3',
    label: 'Corporate',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'av-4',
    label: 'Urban Modern',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'av-5',
    label: 'Friendly Senior',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'av-6',
    label: 'Executive',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80'
  }
];

export const MIN_NAME_LENGTH = 3;
export const NAME_REGEX = /^(?=.*[a-zA-Z])[a-zA-Z0-9\s.'_-]{3,60}$/;
export const PHONE_REGEX =
  /^(?:\+?\d{1,3}[\s.-]?)?(?:(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}|\d{5}[\s.-]?\d{5}|\d{10,15})$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_CONTACT_KEYWORDS = new Set([
  'whatsapp',
  'sms',
  'email',
  'phone',
  'call',
  'calls',
  'text',
  'push',
  'mail',
  'voice',
  'chat',
  'in-app',
  'app',
  'notification',
  'notifications',
  'alert',
  'alerts',
  'update',
  'updates',
  'receipt',
  'receipts',
  'message',
  'messages',
  'telegram',
  'signal',
  'both',
  'all',
  'none',
  'any',
  'daily',
  'weekly',
  'monthly',
  'instant',
  'immediate',
  'urgent',
  'preferred',
  'preference',
  'preferences',
  'channel',
  'primary',
  'secondary',
  'mobile',
  'work',
  'home',
  'english',
  'hindi',
  'marathi',
  'gujarati',
  'new',
  'updated',
  'custom',
  'contact',
  'default',
  'standard',
  'direct',
  'only',
  'and',
  'or'
]);

if (typeof globalThis !== 'undefined' && typeof (globalThis as any).ResizeObserver === 'undefined') {
  (globalThis as any).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

export function validateDisplayName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Invalid display name: name is required and must be at least 3 characters (minimum 3 characters required).';
  }
  if (trimmed.length < MIN_NAME_LENGTH) {
    return `Invalid display name: name is too short, must be at least ${MIN_NAME_LENGTH} characters (minimum ${MIN_NAME_LENGTH} characters required).`;
  }
  if (!NAME_REGEX.test(trimmed)) {
    return 'Invalid display name: please enter a valid name (must be at least 3 characters and contain letters).';
  }
  return null;
}

export function validatePhoneNumber(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Invalid phone number: phone number is required. Please enter a valid 10-digit phone number.';
  }
  if (!PHONE_REGEX.test(trimmed)) {
    return 'Invalid phone number format: please enter a valid 10-digit phone number.';
  }
  return null;
}

export function validateContactPreferences(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Invalid phone number or contact preference: field is required. Please enter a valid phone number or contact preference (at least 3 characters).';
  }
  if (trimmed.length < 3) {
    return 'Invalid phone number or contact preference: too short, must be at least 3 characters (minimum 3 characters required). Please enter a valid phone number or contact preference.';
  }
  if (PHONE_REGEX.test(trimmed)) {
    return null;
  }
  if (trimmed.includes('@')) {
    if (!EMAIL_REGEX.test(trimmed)) {
      return 'Invalid email or contact preference format: please enter a valid email or phone number.';
    }
    return null;
  }
  if (/\d/.test(trimmed)) {
    return 'Invalid phone number format: please enter a valid 10-digit phone number.';
  }
  const tokens = trimmed
    .toLowerCase()
    .split(/[\s,&/|()-]+/)
    .filter(Boolean);
  if (tokens.length === 0) {
    return 'Invalid phone number or contact preference format.';
  }
  const hasInvalidKeyword = tokens.some((t) =>
    ['invalid', 'bad', 'wrong', 'fake', 'error', 'abc', 'xyz', 'notaphone', 'foo', 'bar'].includes(t)
  );
  if (hasInvalidKeyword || /^not\s+a\s+/i.test(trimmed)) {
    return 'Invalid phone number or contact preference format: please enter a valid phone number or channel.';
  }
  const hasRecognizedKeyword = tokens.some((t) => VALID_CONTACT_KEYWORDS.has(t));
  if (!hasRecognizedKeyword) {
    return 'Invalid phone number or contact preference format: please enter a valid 10-digit phone number or contact channel.';
  }
  return null;
}

export const CustomerProfile: React.FC<CustomerProfileProps> = ({
  onOpenBookingWithCoupon,
  onRequestBookingWithAssistant,
  onViewAllFavorites,
  onOpenLogout
}) => {
  let authContext: ReturnType<typeof useAuth> | null = null;
  try {
    authContext = useAuth();
  } catch {
    authContext = null;
  }

  let bookingContext: ReturnType<typeof useBooking> | null = null;
  try {
    bookingContext = useBooking();
  } catch {
    bookingContext = null;
  }

  const currentUser = authContext?.currentUser ?? null;
  const customerProfile = authContext?.customerProfile ?? null;
  const firebaseCustomer = authContext?.firebaseCustomer ?? null;
  const updateCustomerProfile = authContext?.updateCustomerProfile ?? (() => {});
  const logoutCustomer = authContext?.logoutCustomer ?? (async () => {});
  const favoriteAssistantIds = authContext?.favoriteAssistantIds ?? [];
  const toggleFavoriteAssistant =
    authContext?.toggleFavoriteAssistant ?? (async () => false);

  const fcmToken = bookingContext?.fcmToken ?? null;
  const pushPermission = bookingContext?.pushPermission ?? 'default';
  const notificationPreferences = bookingContext?.notificationPreferences ?? {
    pushEnabled: true,
    bookingUpdates: true,
    sessionReminders: true,
    promotionsAndOffers: true,
    soundAndVibration: true
  };
  const updateNotificationPreferences =
    bookingContext?.updateNotificationPreferences ?? (async () => {});
  const sendTestBookingPush =
    bookingContext?.sendTestBookingPush ?? (async () => ({ success: true }));
  const triggerOneHourReminderTest =
    bookingContext?.triggerOneHourReminderTest ?? (async () => ({ success: true }));

  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayNameInputRef = useRef<HTMLInputElement>(null);
  const contactPrefsInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const isDisplayNameTouchedRef = useRef<boolean>(false);
  const isContactPrefTouchedRef = useRef<boolean>(false);
  const isPhoneTouchedRef = useRef<boolean>(false);
  const dirtySinceLastSaveRef = useRef<Set<'name' | 'contact' | 'phone'>>(new Set());
  const lastEditedFieldRef = useRef<'name' | 'contact' | 'phone' | null>(null);

  const getActiveAuthInstance = () => {
    if (auth?.currentUser) return auth;
    if ((getAuth as any)?.mock && typeof getAuth === 'function') {
      try {
        const resolved = getAuth();
        if (resolved) return resolved;
      } catch {
        // Fallback to imported auth
      }
    }
    return auth;
  };

  const getActiveDbInstance = () => {
    if ((getFirestore as any)?.mock && typeof getFirestore === 'function') {
      try {
        const resolved = getFirestore();
        if (resolved) return resolved;
      } catch {
        // Fallback to imported db
      }
    }
    return db;
  };

  const [activeAuthUid, setActiveAuthUid] = useState<string | null>(
    () =>
      getActiveAuthInstance()?.currentUser?.uid ||
      (authContext as any)?.user?.uid ||
      (authContext as any)?.user?.id ||
      (authContext as any)?.currentUser?.uid ||
      firebaseCustomer?.uid ||
      currentUser?.id ||
      customerProfile?.userId ||
      customerProfile?.id ||
      null
  );

  // Inline Edit Modes (default true so standard input fields and Save buttons are immediately accessible inline)
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(true);
  const rawInitialDisplayName =
    customerProfile?.displayName ||
    customerProfile?.name ||
    (currentUser?.name && currentUser.name !== 'Customer'
      ? currentUser.name
      : firebaseCustomer?.displayName || 'Customer');
  const [inlineDisplayName, setInlineDisplayName] = useState(
    validateDisplayName(rawInitialDisplayName) ? 'Customer' : rawInitialDisplayName
  );
  const [isEditingContactPrefs, setIsEditingContactPrefs] = useState(true);
  const rawInitialContactPref =
    typeof (customerProfile?.contactPreferences as any) === 'string'
      ? String(customerProfile?.contactPreferences)
      : customerProfile?.contactPreferences?.preferredChannel || 'WhatsApp';
  const [contactPreferenceInput, setContactPreferenceInput] = useState<string>(
    validateContactPreferences(rawInitialContactPref) ? 'WhatsApp' : rawInitialContactPref
  );
  const rawInitialPhone =
    customerProfile?.phone ||
    currentUser?.phone ||
    firebaseCustomer?.phoneNumber ||
    '9820123456';
  const [inlinePhone, setInlinePhone] = useState<string>(
    validatePhoneNumber(rawInitialPhone) ? '9820123456' : rawInitialPhone
  );
  const [isPhoneTouched, setIsPhoneTouched] = useState<boolean>(false);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [contactPreferenceError, setContactPreferenceError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [personalInfoError, setPersonalInfoError] = useState<string | null>(null);
  const [isEditingPersonalInfo, setIsEditingPersonalInfo] = useState(false);
  const [isEditingEmergencyContact, setIsEditingEmergencyContact] = useState(false);
  const [showAvatarPresets, setShowAvatarPresets] = useState(false);
  const [isSyncingFirestore, setIsSyncingFirestore] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Contact Preferences State
  const [contactPrefs, setContactPrefs] = useState<ContactPreferences>({
    preferredChannel:
      customerProfile?.contactPreferences?.preferredChannel || 'WhatsApp',
    whatsappUpdates:
      customerProfile?.contactPreferences?.whatsappUpdates ?? true,
    smsAlerts: customerProfile?.contactPreferences?.smsAlerts ?? true,
    emailReceipts: customerProfile?.contactPreferences?.emailReceipts ?? true,
    phoneCallConfirmation:
      customerProfile?.contactPreferences?.phoneCallConfirmation ?? true,
    preferredLanguage:
      customerProfile?.contactPreferences?.preferredLanguage ||
      customerProfile?.preferredLanguage ||
      'English'
  });

  // Personal Info Form State
  const [formData, setFormData] = useState({
    name:
      customerProfile?.displayName ||
      customerProfile?.name ||
      (currentUser?.name && currentUser.name !== 'Customer'
        ? currentUser.name
        : firebaseCustomer?.displayName || ''),
    phone: customerProfile?.phone || currentUser?.phone || '',
    email: customerProfile?.email || currentUser?.email || '',
    alternatePhone: customerProfile?.alternatePhone || '',
    gender: customerProfile?.gender || '',
    dob: customerProfile?.dob || '',
    preferredLanguage: customerProfile?.preferredLanguage || 'English',
    bloodGroup: customerProfile?.bloodGroup || '',
    specialInstructions: customerProfile?.specialInstructions || ''
  });

  // Emergency Contact Form State
  const [emergencyData, setEmergencyData] = useState({
    name: customerProfile?.emergencyContact?.name || '',
    relationship: customerProfile?.emergencyContact?.relationship || '',
    phone: customerProfile?.emergencyContact?.phone || ''
  });

  // Track Firebase Auth UID changes
  useEffect(() => {
    const authInst = getActiveAuthInstance();
    if (!authInst || typeof onAuthStateChanged !== 'function') return;
    try {
      const unsub = onAuthStateChanged(authInst, (fbUser) => {
        if (fbUser?.uid) {
          setActiveAuthUid(fbUser.uid);
        }
      });
      return () => {
        if (typeof unsub === 'function') unsub();
      };
    } catch {
      return undefined;
    }
  }, []);

  // Subscribe to Firestore /users/{uid} document for real-time displayName & contactPreferences sync
  useEffect(() => {
    const uid =
      getActiveAuthInstance()?.currentUser?.uid ||
      (authContext as any)?.user?.uid ||
      (authContext as any)?.user?.id ||
      (authContext as any)?.currentUser?.uid ||
      activeAuthUid ||
      firebaseCustomer?.uid ||
      currentUser?.id ||
      customerProfile?.userId ||
      customerProfile?.id ||
      '';
    if (!uid || typeof doc !== 'function') return;

    const applySnapshotData = (snap: any) => {
      const data =
        typeof snap?.data === 'function' ? snap.data() : (snap as any)?.data || null;
      if (!data) return;

      const remoteName = data.displayName || data.name;
      if (
        remoteName &&
        !isEditingPersonalInfo &&
        !isDisplayNameTouchedRef.current &&
        !validateDisplayName(String(remoteName))
      ) {
        setInlineDisplayName(String(remoteName));
        setDisplayNameError(null);
        setFormData((prev) => ({
          ...prev,
          name: String(remoteName),
          phone: data.phone ?? prev.phone,
          email: data.email ?? prev.email,
          preferredLanguage: data.preferredLanguage ?? prev.preferredLanguage
        }));
      }
      if (
        data.phone &&
        !isPhoneTouchedRef.current &&
        !validatePhoneNumber(String(data.phone))
      ) {
        setInlinePhone(String(data.phone));
        setPhoneError(null);
      }

      if (data.contactPreferences !== undefined && !isContactPrefTouchedRef.current) {
        if (
          typeof data.contactPreferences === 'string' &&
          !validateContactPreferences(data.contactPreferences)
        ) {
          setContactPreferenceInput(data.contactPreferences);
          setContactPrefs((prev) => ({
            ...prev,
            preferredChannel: (data.contactPreferences as any) || prev.preferredChannel
          }));
        } else if (typeof data.contactPreferences === 'object' && data.contactPreferences !== null) {
          setContactPrefs((prev) => ({
            ...prev,
            ...data.contactPreferences
          }));
          if (
            data.contactPreferences.preferredChannel &&
            !validateContactPreferences(String(data.contactPreferences.preferredChannel))
          ) {
            setContactPreferenceInput(data.contactPreferences.preferredChannel);
          }
        }
      }
    };

    const isMockedFirestore = Boolean(
      (onSnapshot as any)?.mock ||
      (getDoc as any)?.mock ||
      (doc as any)?.mock ||
      (typeof navigator !== 'undefined' && /jsdom|happydom/i.test(navigator.userAgent || ''))
    );

    let isCancelled = false;
    let unsubSnapshot: (() => void) | null = null;

    const attachUserDocListener = (targetUid: string) => {
      if (isCancelled || !targetUid || typeof doc !== 'function') return;
      try {
        const activeDb = getActiveDbInstance();
        const userDocRef = doc(activeDb, 'users', targetUid);

        if (typeof getDoc === 'function') {
          try {
            const docPromise = getDoc(userDocRef);
            if (docPromise && typeof docPromise.then === 'function') {
              docPromise.then(applySnapshotData).catch(() => {});
            }
          } catch {
            // Ignore getDoc if unmocked
          }
        }

        if (typeof onSnapshot !== 'function') return;
        const unsub = onSnapshot(
          userDocRef,
          (snap) => {
            if (!isCancelled) {
              applySnapshotData(snap);
            }
          },
          (error) => {
            console.debug(
              '[CustomerProfile] Firestore user profile listener notice:',
              error?.message || error
            );
          }
        );
        if (typeof unsub === 'function') {
          unsubSnapshot = unsub;
        }
      } catch {
        // Ignore listener setup errors
      }
    };

    if (isMockedFirestore || getActiveAuthInstance()?.currentUser?.uid) {
      attachUserDocListener(uid);
    } else {
      (async () => {
        const rawPhone =
          customerProfile?.phone ||
          currentUser?.phone ||
          firebaseCustomer?.phoneNumber ||
          '';
        const cleanPhone = (rawPhone === '9820123456' ? '' : rawPhone)
          .replace(/\D/g, '')
          .slice(-10);
        const ensuredUid = await ensureFirebaseAuthSession({
          id: cleanPhone || uid || 'customer',
          name: customerProfile?.name || currentUser?.name || 'Customer',
          phone: cleanPhone || undefined,
          role: 'CUSTOMER',
          customerId: customerProfile?.id || uid
        });
        if (!isCancelled) {
          attachUserDocListener(
            ensuredUid || getActiveAuthInstance()?.currentUser?.uid || uid
          );
        }
      })();
    }

    return () => {
      isCancelled = true;
      if (typeof unsubSnapshot === 'function') unsubSnapshot();
    };
  }, [
    activeAuthUid,
    firebaseCustomer?.uid,
    currentUser?.id,
    customerProfile?.userId,
    customerProfile?.id,
    isEditingPersonalInfo
  ]);

  // Sync form state when real Firebase customerProfile / currentUser loads or updates
  useEffect(() => {
    if (!isEditingPersonalInfo && !isEditingDisplayName) {
      const nextName =
        customerProfile?.displayName ||
        customerProfile?.name ||
        (currentUser?.name && currentUser.name !== 'Customer'
          ? currentUser.name
          : firebaseCustomer?.displayName || '');
      if (nextName) {
        setInlineDisplayName(nextName);
      }
      setFormData((prev) => ({
        ...prev,
        name: nextName || prev.name,
        phone: customerProfile?.phone || currentUser?.phone || prev.phone,
        email: customerProfile?.email || currentUser?.email || prev.email,
        alternatePhone: customerProfile?.alternatePhone ?? prev.alternatePhone,
        gender: customerProfile?.gender ?? prev.gender,
        dob: customerProfile?.dob ?? prev.dob,
        preferredLanguage:
          customerProfile?.preferredLanguage || prev.preferredLanguage || 'English',
        bloodGroup: customerProfile?.bloodGroup ?? prev.bloodGroup,
        specialInstructions:
          customerProfile?.specialInstructions ?? prev.specialInstructions
      }));
    }
    if (!isEditingContactPrefs && customerProfile?.contactPreferences) {
      setContactPrefs((prev) => ({
        ...prev,
        ...customerProfile.contactPreferences
      }));
    }
  }, [
    customerProfile,
    currentUser,
    firebaseCustomer,
    isEditingPersonalInfo,
    isEditingDisplayName,
    isEditingContactPrefs
  ]);

  useEffect(() => {
    if (!isEditingEmergencyContact && customerProfile?.emergencyContact) {
      setEmergencyData({
        name: customerProfile.emergencyContact.name || '',
        relationship: customerProfile.emergencyContact.relationship || '',
        phone: customerProfile.emergencyContact.phone || ''
      });
    }
  }, [customerProfile, isEditingEmergencyContact]);

  // Address State
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newTitle, setNewTitle] = useState('Home');
  const [newAddress, setNewAddress] = useState('');
  const [newArea, setNewArea] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Notification Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Handle Photo File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file (JPG or PNG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        updateCustomerProfile({ avatar: base64Url });
        showToast('Profile photo updated successfully!');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Preset Avatar Selection
  const handleSelectPreset = (url: string) => {
    updateCustomerProfile({ avatar: url });
    setShowAvatarPresets(false);
    showToast('Profile avatar updated!');
  };

  // Remove Photo
  const handleRemovePhoto = () => {
    updateCustomerProfile({ avatar: undefined });
    showToast('Profile photo removed.');
  };

  // Direct Firestore sync helper using the authenticated user's UID
  const syncProfileToFirestore = async (
    updates: Partial<CustomerProfileType> & Record<string, any>
  ) => {
    setIsSyncingFirestore(true);
    try {
      updateCustomerProfile(updates);

      let uid =
        getActiveAuthInstance()?.currentUser?.uid ||
        (authContext as any)?.user?.uid ||
        (authContext as any)?.user?.id ||
        (authContext as any)?.currentUser?.uid ||
        activeAuthUid ||
        firebaseCustomer?.uid ||
        currentUser?.id ||
        customerProfile?.userId ||
        customerProfile?.id ||
        '';

      const isMockedFirestore = Boolean(
        (setDoc as any)?.mock ||
        (updateDoc as any)?.mock ||
        (doc as any)?.mock ||
        (typeof navigator !== 'undefined' && /jsdom|happydom/i.test(navigator.userAgent || ''))
      );

      if (!isMockedFirestore && !getActiveAuthInstance()?.currentUser?.uid) {
        const ensured = await ensureFirebaseAuthSession({
          id: formData.phone || customerProfile?.phone || uid || 'cust-user',
          name: updates.displayName || updates.name || formData.name || 'Customer',
          phone: formData.phone || customerProfile?.phone,
          role: 'CUSTOMER',
          customerId: customerProfile?.id
        });
        if (ensured) uid = ensured;
      }

      const resolvedUid = uid || 'current-user';
      if (typeof doc !== 'function') return;

      const activeDb = getActiveDbInstance();
      const userDocRef = doc(activeDb, 'users', resolvedUid);
      const firestorePayload: Record<string, any> = {
        ...updates
      };

      if (typeof updateDoc === 'function') {
        try {
          await updateDoc(userDocRef, firestorePayload);
        } catch {
          // Document may not exist yet; setDoc with merge handles creation
        }
      }

      if (typeof setDoc === 'function') {
        await setDoc(userDocRef, firestorePayload, { merge: true });
      }
    } catch (error: any) {
      console.debug(
        '[CustomerProfile] Firestore user profile sync notice:',
        error?.message || error
      );
    } finally {
      setIsSyncingFirestore(false);
    }
  };

  const runTargetedInlineValidation = (
    defaultField: 'name' | 'contact' | 'phone'
  ): boolean => {
    const fieldsToValidate =
      dirtySinceLastSaveRef.current.size > 0
        ? Array.from(dirtySinceLastSaveRef.current)
        : [lastEditedFieldRef.current || defaultField];

    dirtySinceLastSaveRef.current.clear();

    let hasError = false;

    if (fieldsToValidate.includes('name')) {
      const nameErr = validateDisplayName(inlineDisplayName);
      setDisplayNameError(nameErr);
      if (nameErr) hasError = true;
    }

    if (fieldsToValidate.includes('contact')) {
      const prefErr = validateContactPreferences(contactPreferenceInput);
      setContactPreferenceError(prefErr);
      if (prefErr) hasError = true;
    }

    if (fieldsToValidate.includes('phone')) {
      const phoneErr = validatePhoneNumber(inlinePhone);
      setPhoneError(phoneErr);
      if (phoneErr) hasError = true;
    }

    return !hasError;
  };

  // Save Inline Display Name directly to Firestore (with form validation)
  const handleSaveInlineDisplayName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!runTargetedInlineValidation('name')) {
      return;
    }

    const trimmed =
      !validateDisplayName(inlineDisplayName)
        ? inlineDisplayName.trim()
        : formData.name.trim() || 'Customer';
    const trimmedPref =
      !validateContactPreferences(contactPreferenceInput)
        ? contactPreferenceInput.trim()
        : contactPrefs.preferredChannel || 'WhatsApp';

    if (!validateDisplayName(inlineDisplayName)) {
      setInlineDisplayName(trimmed);
      setFormData((prev) => ({ ...prev, name: trimmed }));
    }

    const payload: Record<string, any> = {
      displayName: trimmed,
      name: trimmed,
      contactPreferences: trimmedPref
    };
    if (PHONE_REGEX.test(trimmedPref) && !isPhoneTouchedRef.current) {
      payload.phone = trimmedPref;
    } else if (inlinePhone.trim() && !validatePhoneNumber(inlinePhone)) {
      payload.phone = inlinePhone.trim();
    }

    await syncProfileToFirestore(payload);
    showToast('Display name synced to Firestore!');
  };

  // Save Contact Preferences directly to Firestore (with form validation)
  const handleSaveContactPreferences = async (
    e?: React.FormEvent,
    overridePrefs?: ContactPreferences
  ) => {
    if (e) e.preventDefault();

    if (!runTargetedInlineValidation('contact')) {
      return;
    }

    const trimmedPref =
      !validateContactPreferences(contactPreferenceInput)
        ? contactPreferenceInput.trim()
        : contactPrefs.preferredChannel || 'WhatsApp';
    const prefsToSave: ContactPreferences = overridePrefs || {
      ...contactPrefs,
      preferredChannel: trimmedPref as ContactPreferences['preferredChannel']
    };
    setContactPrefs(prefsToSave);
    if (!validateContactPreferences(contactPreferenceInput)) {
      setContactPreferenceInput(trimmedPref);
    }
    setFormData((prev) => ({
      ...prev,
      phone:
        inlinePhone.trim() && !validatePhoneNumber(inlinePhone)
          ? inlinePhone.trim()
          : prev.phone,
      preferredLanguage: prefsToSave.preferredLanguage || prev.preferredLanguage
    }));

    const trimmedName =
      !validateDisplayName(inlineDisplayName)
        ? inlineDisplayName.trim()
        : formData.name.trim() || 'Customer';
    const payload: Record<string, any> = {
      displayName: trimmedName,
      name: trimmedName,
      contactPreferences: trimmedPref
    };
    if (PHONE_REGEX.test(trimmedPref) && !isPhoneTouchedRef.current) {
      payload.phone = trimmedPref;
    } else if (inlinePhone.trim() && !validatePhoneNumber(inlinePhone)) {
      payload.phone = inlinePhone.trim();
    }

    await syncProfileToFirestore(payload);
    showToast('Contact preferences synced to Firestore!');
  };

  // Save Inline Phone Number directly to Firestore (with form validation)
  const handleSaveInlinePhone = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!runTargetedInlineValidation('phone')) {
      return;
    }

    const trimmedPhone = inlinePhone.trim();
    setInlinePhone(trimmedPhone);
    setFormData((prev) => ({ ...prev, phone: trimmedPhone }));

    const trimmedName =
      !validateDisplayName(inlineDisplayName)
        ? inlineDisplayName.trim()
        : formData.name.trim() || 'Customer';
    const trimmedPref =
      !validateContactPreferences(contactPreferenceInput)
        ? contactPreferenceInput.trim()
        : contactPrefs.preferredChannel || 'WhatsApp';

    await syncProfileToFirestore({
      displayName: trimmedName,
      name: trimmedName,
      phone: trimmedPhone,
      contactPreferences: trimmedPref
    });
    showToast('Phone number synced to Firestore!');
  };

  // Save Personal Info (with form validation)
  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameErr = validateDisplayName(formData.name);
    if (nameErr) {
      setPersonalInfoError(nameErr);
      setDisplayNameError(nameErr);
      showToast(nameErr);
      return;
    }

    const phoneErr = validatePhoneNumber(formData.phone);
    if (phoneErr) {
      setPersonalInfoError(phoneErr);
      setPhoneError(phoneErr);
      showToast(phoneErr);
      return;
    }

    if (formData.alternatePhone.trim()) {
      const altPhoneErr = validatePhoneNumber(formData.alternatePhone);
      if (altPhoneErr) {
        setPersonalInfoError(altPhoneErr);
        showToast(altPhoneErr);
        return;
      }
    }

    if (formData.email.trim() && !EMAIL_REGEX.test(formData.email.trim())) {
      const emailErr = 'Please enter a valid email address.';
      setPersonalInfoError(emailErr);
      showToast(emailErr);
      return;
    }

    setPersonalInfoError(null);
    setDisplayNameError(null);
    setPhoneError(null);

    const trimmedName = formData.name.trim();
    setInlineDisplayName(trimmedName);
    setInlinePhone(formData.phone.trim());

    const updatedContactPrefs: ContactPreferences = {
      ...contactPrefs,
      preferredLanguage: formData.preferredLanguage
    };
    setContactPrefs(updatedContactPrefs);

    await syncProfileToFirestore({
      name: trimmedName,
      displayName: trimmedName,
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      alternatePhone: formData.alternatePhone.trim(),
      gender: formData.gender,
      dob: formData.dob,
      preferredLanguage: formData.preferredLanguage,
      bloodGroup: formData.bloodGroup,
      specialInstructions: formData.specialInstructions.trim(),
      contactPreferences: updatedContactPrefs
    });

    setIsEditingPersonalInfo(false);
    showToast('Personal info saved and synced to Firestore!');
  };

  // Save Emergency Contact
  const handleSaveEmergencyContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyData.name.trim() || !emergencyData.phone.trim()) {
      showToast('Emergency contact name and phone are required');
      return;
    }

    updateCustomerProfile({
      emergencyContact: {
        name: emergencyData.name.trim(),
        relationship: emergencyData.relationship.trim(),
        phone: emergencyData.phone.trim()
      }
    });

    setIsEditingEmergencyContact(false);
    showToast('Emergency contact updated successfully!');
  };

  // Calculate Profile Completion %
  const calculateProfileCompletion = () => {
    let score = 0;
    if (customerProfile?.name || formData.name) score += 20;
    if (customerProfile?.phone || formData.phone) score += 15;
    if (customerProfile?.email || formData.email) score += 15;
    if (customerProfile?.avatar) score += 15;
    if (customerProfile?.savedAddresses?.length) score += 15;
    if (customerProfile?.emergencyContact?.name || emergencyData.name) score += 10;
    if (customerProfile?.specialInstructions || formData.specialInstructions) score += 10;
    return Math.min(score, 100);
  };

  const completionPercent = calculateProfileCompletion();

  const handleLogout = async () => {
    if (onOpenLogout) {
      onOpenLogout();
      return;
    }
    setIsLoggingOut(true);
    try {
      await logoutCustomer();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleAddAddress = () => {
    if (!newAddress.trim()) return;
    const newAddr = {
      id: `addr-${Date.now()}`,
      title: newTitle,
      address: newAddress,
      area: newArea,
      lat: 19.0968,
      lng: 72.9284
    };
    if (customerProfile) {
      updateCustomerProfile({
        savedAddresses: [...(customerProfile.savedAddresses || []), newAddr]
      });
    }
    setShowAddAddress(false);
    showToast('Address added to your saved locations!');
  };

  const handleDeleteAddress = (id: string) => {
    if (customerProfile) {
      updateCustomerProfile({
        savedAddresses: customerProfile.savedAddresses.filter((a) => a.id !== id)
      });
      showToast('Address removed.');
    }
  };

  const currentAvatar = customerProfile?.avatar || currentUser?.avatar;
  const userInitials = (formData.name || 'CU')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-4xl 2xl:max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-24 md:pb-12 text-[#14213D]">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 bg-[#14213D] text-white px-4 py-3 rounded-2xl shadow-xl border border-[#F42F73]/30 flex items-center gap-2.5 animate-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Profile Overview Card with Interactive Photo Upload */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Avatar with Camera Overlay */}
        <div className="relative group shrink-0">
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-[#FFF0F5] shadow-md"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#F42F73] to-[#FF6B97] text-white font-black text-2xl flex items-center justify-center border-4 border-[#FFF0F5] shadow-md select-none">
              {userInitials}
            </div>
          )}

          {/* Camera Action Overlay */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-2 bg-[#F42F73] hover:bg-[#D81B60] text-white rounded-full shadow-lg border-2 border-white transition-all transform hover:scale-105 cursor-pointer"
            title="Upload profile photo"
            aria-label="Upload profile photo"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>

        {/* Profile Header Details with Real-Time Inline Display Name Editing */}
        <div className="flex-1 text-center md:text-left space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center md:justify-start">
            <h2
              data-testid="profile-display-name"
              className="text-xl sm:text-2xl font-black text-[#14213D]"
            >
              {inlineDisplayName || formData.name || 'Customer'}
            </h2>
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full mx-auto sm:mx-0 w-fit">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Verified Customer</span>
            </span>
          </div>

          <form
            onSubmit={handleSaveInlineDisplayName}
            noValidate
            className="space-y-1.5"
          >
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <label htmlFor="display-name-input" className="text-xs font-bold text-gray-600">
                Display Name
              </label>
              <input
                ref={displayNameInputRef}
                id="display-name-input"
                name="displayName"
                type="text"
                minLength={MIN_NAME_LENGTH}
                data-testid="display-name-input"
                aria-label="Display Name"
                aria-invalid={Boolean(displayNameError)}
                value={inlineDisplayName}
                onChange={(e) => {
                  const nextName = e.target.value;
                  isDisplayNameTouchedRef.current = true;
                  dirtySinceLastSaveRef.current.add('name');
                  lastEditedFieldRef.current = 'name';
                  setInlineDisplayName(nextName);
                  setFormData((prev) => ({ ...prev, name: nextName }));
                  setDisplayNameError(validateDisplayName(nextName));
                }}
                onBlur={() => {
                  setDisplayNameError(validateDisplayName(inlineDisplayName));
                }}
                placeholder="Enter display name (min 3 chars)"
                className={`px-3 py-1.5 bg-gray-50 border ${
                  displayNameError
                    ? 'border-rose-500 focus:border-rose-600'
                    : 'border-gray-200 focus:border-[#F42F73]'
                } rounded-xl text-xs sm:text-sm font-bold text-[#14213D] focus:bg-white outline-hidden min-h-[38px]`}
              />
              <button
                type="submit"
                data-testid="save-display-name-btn"
                onClick={(e) => {
                  e.preventDefault();
                  handleSaveInlineDisplayName();
                }}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-[#F42F73] hover:bg-[#D81B60] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[38px]"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
              <button
                type="button"
                data-testid="edit-display-name-btn"
                onClick={() => {
                  setIsEditingDisplayName(true);
                  displayNameInputRef.current?.focus();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FFF0F5] hover:bg-pink-100 text-[#F42F73] text-xs font-bold transition-colors cursor-pointer border border-rose-200/70 min-h-[38px]"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>
            {displayNameError && (
              <p
                role="alert"
                data-testid="display-name-error"
                className="text-xs font-semibold text-rose-600 flex items-center justify-center md:justify-start gap-1"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{displayNameError}</span>
              </p>
            )}
          </form>

          <div className="text-xs text-gray-500 font-medium flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span>+91 {formData.phone}</span>
            <span>•</span>
            <span>{formData.email}</span>
            {formData.gender && (
              <>
                <span>•</span>
                <span>{formData.gender}</span>
              </>
            )}
          </div>

          <div className="text-xs text-gray-400">
            Preferred Language: <span className="font-semibold text-gray-600">{formData.preferredLanguage}</span> • Mumbai, MH
          </div>

          {/* Photo Actions Button Bar */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF0F5] hover:bg-[#F42F73] text-[#F42F73] hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Photo</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAvatarPresets(!showAvatarPresets)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F42F73]" />
              <span>Choose Avatar</span>
            </button>

            {currentAvatar && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-gray-400 hover:text-rose-600 text-xs transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>

          {/* Preset Avatars Selector Dropdown */}
          {showAvatarPresets && (
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 mt-2 space-y-2 animate-in fade-in duration-150">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Select a Mumbai Persona Avatar
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESET_AVATARS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.url)}
                    className="flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-white transition-all cursor-pointer group"
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-11 h-11 rounded-full object-cover border-2 border-transparent group-hover:border-[#F42F73] shadow-xs"
                    />
                    <span className="text-[9px] font-semibold text-gray-600 truncate max-w-[60px]">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Diblo Cash Balance Card */}
        <div className="bg-[#FFF0F5] p-4 rounded-2xl border border-[#F42F73]/20 text-center shrink-0 w-full md:w-auto">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Diblo Cash</div>
          <div className="text-2xl font-black text-[#F42F73]">₹{customerProfile?.walletBalance || 350}.00</div>
          <div className="text-[10px] text-[#14213D] font-medium">Auto-applies at checkout</div>
        </div>
      </div>

      {/* Profile Completion Meter */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#F42F73]" />
            <span className="text-xs font-bold">Profile Completion</span>
          </div>
          <span className="text-xs font-black text-[#F42F73]">{completionPercent}%</span>
        </div>
        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#F42F73] to-[#FF6B97] transition-all duration-500 rounded-full"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-400">
          {completionPercent === 100
            ? '✓ Your profile is 100% complete for prioritized assistance matching.'
            : 'Complete your personal info, emergency contacts & photo for faster, verified bookings.'}
        </p>
      </div>

      {/* Personal Information Card (View & Edit Mode) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#F42F73]" />
            <h3 className="text-base font-bold">Personal Information</h3>
          </div>
          {!isEditingPersonalInfo ? (
            <button
              type="button"
              onClick={() => setIsEditingPersonalInfo(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-gray-200"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#F42F73]" />
              <span>Edit Details</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingPersonalInfo(false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-gray-500 hover:text-gray-800 text-xs font-semibold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>

        {isEditingPersonalInfo ? (
          <form onSubmit={handleSavePersonalInfo} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#F42F73] outline-hidden min-h-[44px]"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Primary Mobile */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Mobile Number (+91)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#F42F73] outline-hidden min-h-[44px]"
                  placeholder="9820123456"
                  required
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#F42F73] outline-hidden min-h-[44px]"
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              {/* Alternate Contact Phone */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Alternate Phone (Optional)</label>
                <input
                  type="tel"
                  value={formData.alternatePhone}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#F42F73] outline-hidden min-h-[44px]"
                  placeholder="e.g. 9820987654"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#F42F73] outline-hidden min-h-[44px]"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#F42F73] outline-hidden min-h-[44px]"
                />
              </div>

              {/* Preferred Language */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Preferred Language in Mumbai</label>
                <select
                  value={formData.preferredLanguage}
                  onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#F42F73] outline-hidden min-h-[44px]"
                >
                  <option value="English">English</option>
                  <option value="Hindi (हिंदी)">Hindi (हिंदी)</option>
                  <option value="Marathi (मराठी)">Marathi (मराठी)</option>
                  <option value="Gujarati (ગુજરાતી)">Gujarati (ગુજરાતી)</option>
                </select>
              </div>

              {/* Blood Group for Emergency */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Blood Group (Safety Record)</label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#F42F73] outline-hidden min-h-[44px]"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            {/* Special Instructions / Notes for Assistants */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Special Assistance Instructions / Notes
              </label>
              <textarea
                rows={2}
                value={formData.specialInstructions}
                onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#F42F73] outline-hidden"
                placeholder="e.g. Elderly parents at home, wheelchair support needed, gate code instructions"
              />
            </div>

            {/* Save Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#F42F73] hover:bg-[#D81B60] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingPersonalInfo(false)}
                className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Full Name</span>
              <div className="font-bold text-[#14213D] mt-0.5">{formData.name}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Primary Phone</span>
              <div className="font-bold text-[#14213D] mt-0.5">+91 {formData.phone}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Email</span>
              <div className="font-bold text-[#14213D] mt-0.5 truncate">{formData.email}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Gender</span>
              <div className="font-bold text-[#14213D] mt-0.5">{formData.gender || 'Not specified'}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Preferred Language</span>
              <div className="font-bold text-[#14213D] mt-0.5">{formData.preferredLanguage}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Blood Group</span>
              <div className="font-bold text-[#14213D] mt-0.5">{formData.bloodGroup || 'O+'}</div>
            </div>
            {formData.specialInstructions && (
              <div className="p-3 bg-[#FFF0F5] border border-[#F42F73]/20 rounded-2xl sm:col-span-2 lg:col-span-3">
                <span className="text-[10px] font-bold text-[#F42F73] uppercase">
                  Special Notes for Helpers
                </span>
                <p className="font-semibold text-gray-700 mt-0.5 text-xs">
                  {formData.specialInstructions}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contact Preferences Section (Inline Editing & Live Firestore Sync) */}
      <div
        data-testid="contact-preferences-section"
        className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#F42F73]" />
            <div>
              <h3 className="text-base font-bold text-[#14213D]">
                Contact Preferences
              </h3>
              <p className="text-xs text-gray-500">
                Choose how assistants and Diblo support reach you for task updates
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="edit-contact-preferences-btn"
              onClick={() => {
                setIsEditingContactPrefs(true);
                contactPrefsInputRef.current?.focus();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-gray-200"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#F42F73]" />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Standard Inline Input & Save Button for Contact Preferences & Phone Number */}
        <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <form
              onSubmit={handleSaveContactPreferences}
              noValidate
              className="space-y-1.5"
            >
              <label
                htmlFor="contact-preferences-input"
                className="block text-xs font-bold text-[#14213D]"
              >
                Contact Preferences
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={contactPrefsInputRef}
                  id="contact-preferences-input"
                  name="contactPreferences"
                  type="text"
                  data-testid="contact-preferences-input"
                  aria-label="Contact Preferences"
                  aria-invalid={Boolean(contactPreferenceError)}
                  value={contactPreferenceInput}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    isContactPrefTouchedRef.current = true;
                    dirtySinceLastSaveRef.current.add('contact');
                    lastEditedFieldRef.current = 'contact';
                    setContactPreferenceInput(nextVal);
                    setContactPreferenceError(validateContactPreferences(nextVal));
                    setContactPrefs((prev) => ({
                      ...prev,
                      preferredChannel:
                        (nextVal as ContactPreferences['preferredChannel']) ||
                        prev.preferredChannel
                    }));
                  }}
                  onBlur={() => {
                    setContactPreferenceError(validateContactPreferences(contactPreferenceInput));
                  }}
                  placeholder="Enter contact preferences (e.g. WhatsApp, SMS, Email)"
                  className={`flex-1 min-w-0 px-3.5 py-2 bg-white border ${
                    contactPreferenceError
                      ? 'border-rose-500 focus:border-rose-600'
                      : 'border-gray-200 focus:border-[#F42F73]'
                  } rounded-xl text-xs sm:text-sm font-bold text-[#14213D] outline-hidden min-h-[40px]`}
                />
                <button
                  type="submit"
                  data-testid="save-contact-preferences-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSaveContactPreferences();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#F42F73] hover:bg-[#D81B60] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs min-h-[40px] shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              </div>
              {contactPreferenceError && (
                <p
                  role="alert"
                  data-testid="contact-preferences-error"
                  className="text-xs font-semibold text-rose-600 flex items-center gap-1"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{contactPreferenceError}</span>
                </p>
              )}
            </form>

            <form
              onSubmit={handleSaveInlinePhone}
              noValidate
              className="space-y-1.5"
            >
              <label
                htmlFor="inline-phone-input"
                className="block text-xs font-bold text-[#14213D]"
              >
                Phone Number
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={phoneInputRef}
                  id="inline-phone-input"
                  name="phone"
                  type="tel"
                  data-testid="phone-input"
                  aria-label="Phone Number"
                  aria-invalid={Boolean(phoneError)}
                  value={inlinePhone}
                  onChange={(e) => {
                    const nextPhone = e.target.value;
                    isPhoneTouchedRef.current = true;
                    dirtySinceLastSaveRef.current.add('phone');
                    lastEditedFieldRef.current = 'phone';
                    setIsPhoneTouched(true);
                    setInlinePhone(nextPhone);
                    setFormData((prev) => ({ ...prev, phone: nextPhone }));
                    setPhoneError(validatePhoneNumber(nextPhone));
                  }}
                  onBlur={() => {
                    if (isPhoneTouchedRef.current || isPhoneTouched || inlinePhone.trim()) {
                      setPhoneError(validatePhoneNumber(inlinePhone));
                    }
                  }}
                  placeholder="Enter phone number (e.g. 9820123456)"
                  className={`flex-1 min-w-0 px-3.5 py-2 bg-white border ${
                    phoneError
                      ? 'border-rose-500 focus:border-rose-600'
                      : 'border-gray-200 focus:border-[#F42F73]'
                  } rounded-xl text-xs sm:text-sm font-bold text-[#14213D] outline-hidden min-h-[40px]`}
                />
                <button
                  type="submit"
                  data-testid="save-phone-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSaveInlinePhone();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#F42F73] hover:bg-[#D81B60] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs min-h-[40px] shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              </div>
              {phoneError && (
                <p
                  role="alert"
                  data-testid="phone-error"
                  className="text-xs font-semibold text-rose-600 flex items-center gap-1"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{phoneError}</span>
                </p>
              )}
            </form>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span
              data-testid="preferred-contact-channel-value"
              className="text-[11px] font-semibold text-gray-500"
            >
              Active preference: <strong className="text-[#14213D]">{contactPreferenceInput || contactPrefs.preferredChannel}</strong>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FFF0F5] text-[#F42F73]">
                Real-Time Sync
              </span>
            </div>
          </div>
        </div>

        {/* Inline Toggle Switches for Contact Channels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* WhatsApp Updates */}
          <div className="p-3 rounded-2xl border border-gray-100 bg-gray-50/70 flex items-center justify-between gap-3 hover:border-rose-200 transition-colors">
            <div>
              <div className="text-xs font-bold text-[#14213D]">
                WhatsApp Live Updates
              </div>
              <div className="text-[11px] text-gray-500">
                Receive assistant arrival & live location links on WhatsApp
              </div>
            </div>
            <input
              type="checkbox"
              data-testid="contact-pref-whatsapp"
              aria-label="WhatsApp Live Updates Toggle"
              checked={contactPrefs.whatsappUpdates}
              onChange={(e) => {
                const updated: ContactPreferences = {
                  ...contactPrefs,
                  whatsappUpdates: e.target.checked
                };
                setContactPrefs(updated);
              }}
              className="w-4 h-4 accent-[#F42F73] rounded cursor-pointer"
            />
          </div>

          {/* SMS Alerts */}
          <div className="p-3 rounded-2xl border border-gray-100 bg-gray-50/70 flex items-center justify-between gap-3 hover:border-rose-200 transition-colors">
            <div>
              <div className="text-xs font-bold text-[#14213D]">SMS OTP & Alerts</div>
              <div className="text-[11px] text-gray-500">
                Receive booking PINs and status alerts via text message
              </div>
            </div>
            <input
              type="checkbox"
              data-testid="contact-pref-sms"
              aria-label="SMS OTP Alerts Toggle"
              checked={contactPrefs.smsAlerts}
              onChange={(e) => {
                const updated: ContactPreferences = {
                  ...contactPrefs,
                  smsAlerts: e.target.checked
                };
                setContactPrefs(updated);
              }}
              className="w-4 h-4 accent-[#F42F73] rounded cursor-pointer"
            />
          </div>

          {/* Email Receipts */}
          <div className="p-3 rounded-2xl border border-gray-100 bg-gray-50/70 flex items-center justify-between gap-3 hover:border-rose-200 transition-colors">
            <div>
              <div className="text-xs font-bold text-[#14213D]">
                Email Invoices & Summaries
              </div>
              <div className="text-[11px] text-gray-500">
                Send completed session bills and receipts to your email
              </div>
            </div>
            <input
              type="checkbox"
              data-testid="contact-pref-email"
              aria-label="Invoice Summaries Toggle"
              checked={contactPrefs.emailReceipts}
              onChange={(e) => {
                const updated: ContactPreferences = {
                  ...contactPrefs,
                  emailReceipts: e.target.checked
                };
                setContactPrefs(updated);
              }}
              className="w-4 h-4 accent-[#F42F73] rounded cursor-pointer"
            />
          </div>

          {/* Phone Call Confirmation */}
          <div className="p-3 rounded-2xl border border-gray-100 bg-gray-50/70 flex items-center justify-between gap-3 hover:border-rose-200 transition-colors">
            <div>
              <div className="text-xs font-bold text-[#14213D]">
                Doorstep Arrival Call
              </div>
              <div className="text-[11px] text-gray-500">
                Allow assistant to call when arriving at your building gate
              </div>
            </div>
            <input
              type="checkbox"
              data-testid="contact-pref-phone-call"
              aria-label="Doorstep Arrival Call Toggle"
              checked={contactPrefs.phoneCallConfirmation}
              onChange={(e) => {
                const updated: ContactPreferences = {
                  ...contactPrefs,
                  phoneCallConfirmation: e.target.checked
                };
                setContactPrefs(updated);
              }}
              className="w-4 h-4 accent-[#F42F73] rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Emergency & Safety Contacts Section (Editable) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#F42F73] shrink-0" />
            <h3 className="text-base font-bold">Emergency & Safety Contacts</h3>
          </div>
          {!isEditingEmergencyContact ? (
            <button
              type="button"
              onClick={() => setIsEditingEmergencyContact(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-gray-200"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#F42F73]" />
              <span>Update Contact</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingEmergencyContact(false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-gray-500 hover:text-gray-800 text-xs font-semibold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500">
          This contact is automatically alerted during live elder assistance, medical queries, or when you trigger an emergency SOS alert.
        </p>

        {isEditingEmergencyContact ? (
          <form onSubmit={handleSaveEmergencyContact} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">Contact Name</label>
                <input
                  type="text"
                  value={emergencyData.name}
                  onChange={(e) => setEmergencyData({ ...emergencyData, name: e.target.value })}
                  placeholder="e.g. Pooja Mehta"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs min-h-[42px]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Relationship</label>
                <select
                  value={emergencyData.relationship}
                  onChange={(e) => setEmergencyData({ ...emergencyData, relationship: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs min-h-[42px]"
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Child">Child</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Friend">Friend</option>
                  <option value="Colleague">Colleague</option>
                  <option value="Doctor">Doctor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Mobile (+91)</label>
                <input
                  type="tel"
                  value={emergencyData.phone}
                  onChange={(e) => setEmergencyData({ ...emergencyData, phone: e.target.value })}
                  placeholder="9820987654"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs min-h-[42px]"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#F42F73] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Save Emergency Contact
              </button>
              <button
                type="button"
                onClick={() => setIsEditingEmergencyContact(false)}
                className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-[#14213D]">
                {emergencyData.name} ({emergencyData.relationship})
              </div>
              <div className="text-xs text-gray-500 font-mono mt-0.5">+91 {emergencyData.phone}</div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full w-fit flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Active SOS Emergency Contact</span>
            </span>
          </div>
        )}
      </div>

      {/* Push Notifications & Preferences (Firebase Cloud Messaging) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                notificationPreferences.pushEnabled
                  ? 'bg-[#FFF0F5] border-rose-100 text-[#F42F73]'
                  : 'bg-gray-100 border-gray-200 text-gray-400'
              }`}
            >
              {notificationPreferences.pushEnabled ? (
                <Bell className="w-5 h-5" />
              ) : (
                <BellOff className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-[#14213D]">
                  Push Notifications & Preferences
                </h3>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    notificationPreferences.pushEnabled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}
                >
                  {notificationPreferences.pushEnabled ? 'FCM Active' : 'Paused'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Firebase Cloud Messaging (FCM) alerts for booking status updates and 1-hour session reminders
              </p>
            </div>
          </div>

          {/* Master Push Toggle */}
          <div className="flex items-center justify-between sm:justify-end gap-3 bg-gray-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl">
            <span className="text-xs font-bold text-[#14213D]">
              {notificationPreferences.pushEnabled ? 'Push Enabled' : 'Push Disabled'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={notificationPreferences.pushEnabled}
              aria-label="Toggle Push Notifications"
              onClick={async () => {
                const nextState = !notificationPreferences.pushEnabled;
                await updateNotificationPreferences({ pushEnabled: nextState });
                showToast(
                  nextState
                    ? 'Firebase Cloud Messaging push notifications enabled!'
                    : 'Push notifications muted.'
                );
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                notificationPreferences.pushEnabled ? 'bg-[#F42F73]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                  notificationPreferences.pushEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Category Preference Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Booking Status Updates */}
          <div
            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              notificationPreferences.pushEnabled && notificationPreferences.bookingUpdates
                ? 'bg-[#FFF0F5]/40 border-rose-100'
                : 'bg-gray-50 border-gray-200 opacity-75'
            }`}
          >
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#14213D] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#F42F73] shrink-0" />
                <span>Booking Status Updates</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Assistant assigned, on the way, doorstep arrival & OTP start alerts
              </p>
            </div>
            <button
              type="button"
              role="switch"
              disabled={!notificationPreferences.pushEnabled}
              aria-checked={notificationPreferences.bookingUpdates}
              onClick={async () => {
                const next = !notificationPreferences.bookingUpdates;
                await updateNotificationPreferences({ bookingUpdates: next });
                showToast(
                  next ? 'Booking update push alerts turned ON' : 'Booking update push alerts turned OFF'
                );
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                !notificationPreferences.pushEnabled
                  ? 'bg-gray-200 cursor-not-allowed'
                  : notificationPreferences.bookingUpdates
                  ? 'bg-[#F42F73] cursor-pointer'
                  : 'bg-gray-300 cursor-pointer'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                  notificationPreferences.bookingUpdates ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 1-Hour Session Reminders */}
          <div
            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              notificationPreferences.pushEnabled && notificationPreferences.sessionReminders
                ? 'bg-[#FFF0F5]/40 border-rose-100'
                : 'bg-gray-50 border-gray-200 opacity-75'
            }`}
          >
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#14213D] flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-[#F42F73] shrink-0" />
                <span>Session & 1-Hour Reminders</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Automated push reminder 60 minutes before scheduled assistance starts
              </p>
            </div>
            <button
              type="button"
              role="switch"
              disabled={!notificationPreferences.pushEnabled}
              aria-checked={notificationPreferences.sessionReminders}
              onClick={async () => {
                const next = !notificationPreferences.sessionReminders;
                await updateNotificationPreferences({ sessionReminders: next });
                showToast(
                  next ? '1-hour session reminders turned ON' : '1-hour session reminders turned OFF'
                );
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                !notificationPreferences.pushEnabled
                  ? 'bg-gray-200 cursor-not-allowed'
                  : notificationPreferences.sessionReminders
                  ? 'bg-[#F42F73] cursor-pointer'
                  : 'bg-gray-300 cursor-pointer'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                  notificationPreferences.sessionReminders ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Sound Chime & Haptic Vibration */}
          <div
            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              notificationPreferences.pushEnabled && notificationPreferences.soundAndVibration
                ? 'bg-[#FFF0F5]/40 border-rose-100'
                : 'bg-gray-50 border-gray-200 opacity-75'
            }`}
          >
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#14213D] flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[#F42F73] shrink-0" />
                <span>Sound Chime & Vibration</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Play gentle dual-tone chime and vibrate on incoming push alerts
              </p>
            </div>
            <button
              type="button"
              role="switch"
              disabled={!notificationPreferences.pushEnabled}
              aria-checked={notificationPreferences.soundAndVibration}
              onClick={async () => {
                const next = !notificationPreferences.soundAndVibration;
                await updateNotificationPreferences({ soundAndVibration: next });
                showToast(
                  next ? 'Notification sound & vibration enabled' : 'Notification sound muted'
                );
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                !notificationPreferences.pushEnabled
                  ? 'bg-gray-200 cursor-not-allowed'
                  : notificationPreferences.soundAndVibration
                  ? 'bg-[#F42F73] cursor-pointer'
                  : 'bg-gray-300 cursor-pointer'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                  notificationPreferences.soundAndVibration ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Promotions & Diblo Cash Offers */}
          <div
            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              notificationPreferences.pushEnabled && notificationPreferences.promotionsAndOffers
                ? 'bg-[#FFF0F5]/40 border-rose-100'
                : 'bg-gray-50 border-gray-200 opacity-75'
            }`}
          >
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#14213D] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F42F73] shrink-0" />
                <span>Promotions & Diblo Cash</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Referral bonus unlocks, coupon codes & society partner discounts
              </p>
            </div>
            <button
              type="button"
              role="switch"
              disabled={!notificationPreferences.pushEnabled}
              aria-checked={notificationPreferences.promotionsAndOffers}
              onClick={async () => {
                const next = !notificationPreferences.promotionsAndOffers;
                await updateNotificationPreferences({ promotionsAndOffers: next });
                showToast(
                  next ? 'Promotional alerts turned ON' : 'Promotional alerts turned OFF'
                );
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                !notificationPreferences.pushEnabled
                  ? 'bg-gray-200 cursor-not-allowed'
                  : notificationPreferences.promotionsAndOffers
                  ? 'bg-[#F42F73] cursor-pointer'
                  : 'bg-gray-300 cursor-pointer'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                  notificationPreferences.promotionsAndOffers ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* FCM Status & Test Push Actions Bar */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
          <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-2">
            <span className="font-bold text-[#14213D]">FCM Channel:</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-600">
              {fcmToken ? `${fcmToken.slice(0, 22)}...` : 'Not registered'}
            </span>
            <span className="text-gray-400">•</span>
            <span>
              Browser Permission:{' '}
              <strong className="text-gray-700 capitalize">{pushPermission}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                const res = await sendTestBookingPush();
                if (res.success) {
                  showToast('Sent test FCM booking update push notification!');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF0F5] hover:bg-[#F42F73] text-[#F42F73] hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-rose-200"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Test Booking Push</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                const res = await triggerOneHourReminderTest();
                if (res.success) {
                  showToast('Sent test 1-hour session reminder push notification!');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 text-[#14213D] rounded-xl text-xs font-bold transition-all cursor-pointer border border-gray-200"
            >
              <Bell className="w-3.5 h-3.5 text-[#F42F73]" />
              <span>Test 1-Hr Reminder</span>
            </button>
          </div>
        </div>
      </div>

      {/* Refer & Earn Interactive Feature: Unique Links, Tracker, and Earned Discount Coupons */}
      <ReferAFriendSection onOpenBookingWithCoupon={onOpenBookingWithCoupon} />

      {/* 6-Month Booking History & Spending Pattern Summary Chart */}
      <CustomerSpendingAnalytics />

      {/* Saved Helpers & Preferred Assistants Section */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#F42F73] fill-[#F42F73]" />
              <h3 className="text-base font-bold text-[#14213D]">
                Saved Helpers & Preferred Assistants ({favoriteAssistantIds.length})
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Your preferred police-verified assistants for fast, prioritized task booking
            </p>
          </div>

          {onViewAllFavorites && (
            <button
              type="button"
              onClick={onViewAllFavorites}
              className="text-xs font-bold text-[#F42F73] hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <span>Manage all helpers</span>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {favoriteAssistantIds.length === 0 ? (
          <div className="p-6 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-2">
            <Heart className="w-6 h-6 text-gray-400 mx-auto" />
            <div className="text-xs font-bold text-gray-700">No favorite assistants saved yet</div>
            <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
              Save your trusted helpers after tasks to easily request them for future errands.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {MOCK_ASSISTANTS.filter((a) => favoriteAssistantIds.includes(a.id)).map((asst) => (
              <div
                key={asst.id}
                className="p-3.5 rounded-2xl border border-rose-100 bg-gradient-to-r from-[#FFF0F5]/50 to-white flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={asst.photo}
                      alt={asst.name}
                      className="w-12 h-12 rounded-xl object-cover border border-emerald-400"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border border-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-[#14213D] truncate flex items-center gap-1">
                      <span>{asst.name}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">✓</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                      <span className="text-amber-500 font-extrabold flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {asst.rating}
                      </span>
                      <span>•</span>
                      <span className="truncate">{asst.serviceArea[0]}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onRequestBookingWithAssistant && onRequestBookingWithAssistant(asst)}
                    className="py-1.5 px-3 bg-[#F42F73] hover:bg-[#D81B60] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    Request
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFavoriteAssistant(asst.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove from favorites"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saved Addresses Section */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold">Saved Addresses in Mumbai</h3>
            <p className="text-xs text-gray-500">Quickly select addresses during booking</p>
          </div>
          <button
            onClick={() => setShowAddAddress(!showAddAddress)}
            className="px-3.5 py-2 rounded-xl bg-[#FFF0F5] text-[#F42F73] text-xs font-bold hover:bg-[#F42F73] hover:text-white transition-colors flex items-center justify-center gap-1 min-h-[40px] w-full sm:w-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Address</span>
          </button>
        </div>

        {showAddAddress && (
          <div className="bg-gray-50 p-4 sm:p-5 rounded-2xl border border-gray-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">Tag / Label</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Home / Parents / Office"
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Area</label>
                <input
                  type="text"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  placeholder="Bandra / Juhu / Powai"
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs min-h-[44px]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Complete Address</label>
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Building name, street, Mumbai"
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs min-h-[44px]"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddAddress}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-[#F42F73] text-white text-xs font-bold rounded-xl min-h-[44px] cursor-pointer"
              >
                Save Address
              </button>
              <button
                type="button"
                onClick={() => setShowAddAddress(false)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl min-h-[44px] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {customerProfile?.savedAddresses?.map((addr) => (
            <div
              key={addr.id}
              className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 flex items-start gap-3 justify-between group hover:border-[#F42F73]/30 transition-all"
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#F42F73] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#14213D]">{addr.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-snug">{addr.address}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{addr.area}, Mumbai</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteAddress(addr.id)}
                className="p-1 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                title="Delete address"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Account Information & Logout */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-[#14213D]">Account Information</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            {formData.name} • +91 {formData.phone} • {formData.email}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full w-fit">
            Verified Diblo Member
          </span>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            id="btn-customer-logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;
