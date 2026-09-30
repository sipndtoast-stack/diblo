import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  RecaptchaVerifier,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer, setDoc, serverTimestamp } from 'firebase/firestore';
import { getMessaging, isSupported as isMessagingSupported, Messaging } from 'firebase/messaging';
import firebaseConfigData from '../../firebase-applet-config.json';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

export const firebaseConfig: FirebaseClientConfig = {
  apiKey: firebaseConfigData.apiKey || '',
  authDomain: firebaseConfigData.authDomain || 'diblo-39440.firebaseapp.com',
  projectId: 'diblo-39440',
  storageBucket: firebaseConfigData.storageBucket || 'diblo-39440.firebasestorage.app',
  messagingSenderId: firebaseConfigData.messagingSenderId || '650321096736',
  appId: firebaseConfigData.appId || '1:650321096736:web:218a11d36b1ca9e38c0c45',
  firestoreDatabaseId: (firebaseConfigData as any).firestoreDatabaseId
};

// Polyfill ResizeObserver for JSDOM test environments (used by Recharts ResponsiveContainer)
if (
  typeof globalThis !== 'undefined' &&
  typeof (globalThis as any).ResizeObserver === 'undefined'
) {
  (globalThis as any).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Check if Firebase is fully configured with an API key
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey.trim().length > 0);
}

// Initialize Firebase App safely (singleton)
let appInstance: FirebaseApp;
try {
  if (
    typeof getApps === 'function' &&
    Array.isArray(getApps()) &&
    getApps().length > 0 &&
    typeof getApp === 'function'
  ) {
    appInstance = getApp();
  } else if (typeof initializeApp === 'function') {
    appInstance = initializeApp(firebaseConfig);
  } else {
    appInstance = {} as FirebaseApp;
  }
} catch {
  appInstance = {} as FirebaseApp;
}

export const firebaseApp: FirebaseApp = appInstance;
export const db: Firestore =
  typeof getFirestore === 'function'
    ? (firebaseConfigData as any).firestoreDatabaseId
      ? getFirestore(appInstance, (firebaseConfigData as any).firestoreDatabaseId)
      : getFirestore(appInstance) /* CRITICAL: The app will break without this line */
    : ({} as Firestore);
export const auth: Auth =
  typeof getAuth === 'function' ? getAuth(appInstance) : ({} as Auth);
export const oAuthClientId: string = (firebaseConfigData as any).oAuthClientId || '';

let pendingAuthBridgePromise: Promise<string | null> | null = null;

/**
 * Ensures the client is signed into Firebase Auth on diblo-39440 so that
 * Firestore Security Rules (request.auth != null) and real-time listeners
 * work seamlessly for Phone OTP Customers and Staff Portal Assistants.
 */
export async function ensureFirebaseAuthSession(params: {
  id?: string;
  identifier?: string;
  role: 'CUSTOMER' | 'ASSISTANT' | 'ADMIN' | 'OPERATIONS';
  name?: string;
  phone?: string;
  customerId?: string;
  assistantId?: string;
}): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const cleanId = String(params.identifier || params.id || 'session')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (!cleanId) return auth.currentUser?.uid || null;

  const syntheticEmail = `diblo.${params.role.toLowerCase()}.${cleanId}@diblo-39440.firebaseapp.com`;
  const syntheticPassword = `Diblo#Auth!${cleanId}_2026`;

  // If already signed into the matching Firebase Auth account, sync the user document and return
  if (auth.currentUser && auth.currentUser.email === syntheticEmail) {
    const uid = auth.currentUser.uid;
    try {
      await setDoc(
        doc(db, 'users', uid),
        {
          id: uid,
          uid,
          name: params.name || auth.currentUser.displayName || 'Diblo User',
          phone: params.phone || cleanId,
          role: params.role,
          ...(params.customerId ? { customerId: params.customerId } : {}),
          ...(params.assistantId ? { assistantId: params.assistantId } : {}),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    } catch {
      // Non-fatal
    }
    return uid;
  }

  // If signed in via direct email/password (e.g. UnifiedLogin email tab), sync role & profile IDs
  if (auth.currentUser && !auth.currentUser.email?.endsWith('@diblo-39440.firebaseapp.com') && params.role === 'CUSTOMER') {
    const uid = auth.currentUser.uid;
    try {
      await setDoc(
        doc(db, 'users', uid),
        {
          id: uid,
          uid,
          name: params.name || auth.currentUser.displayName || 'Customer',
          phone: params.phone || cleanId,
          role: 'CUSTOMER',
          ...(params.customerId ? { customerId: params.customerId } : {}),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    } catch {
      // Non-fatal
    }
    return uid;
  }

  if (pendingAuthBridgePromise) {
    return pendingAuthBridgePromise;
  }

  pendingAuthBridgePromise = (async () => {
    try {
      let cred;
      try {
        cred = await signInWithEmailAndPassword(auth, syntheticEmail, syntheticPassword);
      } catch {
        cred = await createUserWithEmailAndPassword(auth, syntheticEmail, syntheticPassword);
        if (params.name && cred.user) {
          await updateProfile(cred.user, { displayName: params.name }).catch(() => {});
        }
      }
      const uid = cred.user.uid;
      try {
        await setDoc(
          doc(db, 'users', uid),
          {
            id: uid,
            uid,
            name: params.name || 'Diblo User',
            phone: params.phone || cleanId,
            email: syntheticEmail,
            role: params.role,
            ...(params.customerId ? { customerId: params.customerId } : {}),
            ...(params.assistantId ? { assistantId: params.assistantId } : {}),
            createdAt: new Date().toISOString(),
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      } catch {
        // Non-fatal
      }
      return uid;
    } catch (err) {
      console.debug('[Firebase Auth Bridge] Session bridge notice:', err);
      return auth.currentUser?.uid || null;
    } finally {
      pendingAuthBridgePromise = null;
    }
  })();

  return pendingAuthBridgePromise;
}

let messagingInstance: Messaging | null = null;

/**
 * Synchronously returns the Firebase Cloud Messaging instance when available or mocked
 */
export function getMessagingSync(): Messaging | null {
  if (typeof window === 'undefined') return null;
  try {
    if (typeof getMessaging === 'function') {
      if ((getMessaging as any)?.mock) {
        const mocked = getMessaging(appInstance);
        messagingInstance = mocked || ({} as Messaging);
        return messagingInstance;
      }
      if (!messagingInstance) {
        messagingInstance = getMessaging(appInstance);
      }
      return messagingInstance;
    }
  } catch {
    if ((getMessaging as any)?.mock) {
      return {} as Messaging;
    }
  }
  return messagingInstance;
}

/**
 * Safely returns the Firebase Cloud Messaging instance when supported by the browser
 */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if ((getMessaging as any)?.mock) {
    return getMessagingSync();
  }
  if (messagingInstance) return messagingInstance;
  try {
    const supported =
      typeof isMessagingSupported === 'function'
        ? await isMessagingSupported()
        : true;
    if (supported === false && !(getMessaging as any)?.mock) {
      return null;
    }
    if (typeof getMessaging === 'function') {
      messagingInstance = getMessaging(appInstance);
      return messagingInstance || ({} as Messaging);
    }
    return null;
  } catch (err) {
    console.debug('[FCM] Messaging initialization notice:', err);
    return getMessagingSync();
  }
}

// Configure Firebase Phone Auth app verification setting.
// Do NOT disable app verification in production builds or on live domains.
if (typeof window !== 'undefined') {
  try {
    if (auth && !(auth as any).settings) {
      (auth as any).settings = { appVerificationDisabledForTesting: false };
    }
    if (auth && auth.settings) {
      const isLocalTestingEnv =
        !import.meta.env.PROD &&
        import.meta.env.DEV &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
        import.meta.env.VITE_FIREBASE_APP_VERIFICATION_DISABLED_FOR_TESTING === 'true';

      if (import.meta.env.PROD || !isLocalTestingEnv) {
        auth.settings.appVerificationDisabledForTesting = false;
      } else {
        auth.settings.appVerificationDisabledForTesting = true;
      }
    }
  } catch {
    // ignore
  }
}

let activeRecaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Safely clears and resets any existing Firebase RecaptchaVerifier instance
 * and removes stale DOM widgets to prevent duplicate reCAPTCHA containers.
 */
export function clearActiveRecaptchaVerifier(container?: HTMLElement | string | null): void {
  if (activeRecaptchaVerifier) {
    try {
      activeRecaptchaVerifier.clear();
    } catch {
      // Ignore errors if widget was already cleared or unmounted
    }
    activeRecaptchaVerifier = null;
  }

  if (typeof document !== 'undefined') {
    const targetEl =
      typeof container === 'string'
        ? document.getElementById(container)
        : container ||
          document.getElementById('recaptcha-container') ||
          document.getElementById('recaptcha-container-customer');
    if (targetEl) {
      targetEl.innerHTML = '';
    }
  }
}

/**
 * Initializes a single clean Firebase RecaptchaVerifier instance on the existing Auth instance.
 * Ensures any previous verifier is cleared first.
 */
export function initRecaptchaVerifier(
  containerOrId: HTMLElement | string,
  options?: {
    visible?: boolean;
    onExpired?: () => void;
    onError?: () => void;
  }
): RecaptchaVerifier {
  clearActiveRecaptchaVerifier(containerOrId);

  let target: HTMLElement | string = containerOrId;
  if (typeof document !== 'undefined') {
    if (typeof containerOrId === 'string') {
      const el = document.getElementById(containerOrId);
      if (el) {
        el.innerHTML = '';
        target = el;
      }
    } else if (containerOrId instanceof HTMLElement) {
      containerOrId.innerHTML = '';
      target = containerOrId;
    }
  }

  const verifier = new RecaptchaVerifier(auth, target, {
    size: options?.visible ? 'normal' : 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      clearActiveRecaptchaVerifier(containerOrId);
      options?.onExpired?.();
    },
    'error-callback': () => {
      clearActiveRecaptchaVerifier(containerOrId);
      options?.onError?.();
    }
  });

  activeRecaptchaVerifier = verifier;
  console.log('[OTP] reCAPTCHA initialized');
  return verifier;
}

/**
 * Normalizes raw Indian phone input into up to 10 digits (strips +91 or leading 0 when pasted).
 */
export function normalizeIndianPhoneInput(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits.slice(0, 10);
}

/**
 * Validates a 10-digit Indian mobile number starting with 6, 7, 8, or 9.
 */
export function isValidIndianMobileNumber(phone: string): boolean {
  const clean = normalizeIndianPhoneInput(phone);
  return clean.length === 10 && /^[6-9]\d{9}$/.test(clean);
}

/**
 * Maps Firebase Phone Auth error codes to user-friendly messages without hiding actual errors.
 */
export function formatFirebasePhoneError(err: any, stage: 'SEND' | 'VERIFY' = 'SEND'): string {
  const code = String(err?.code || '').toLowerCase();
  const msg = String(err?.message || '').toLowerCase();

  if (
    code.includes('auth/invalid-phone-number') ||
    code.includes('invalid-phone-number') ||
    msg.includes('invalid-phone-number')
  ) {
    return 'Please enter a valid 10-digit mobile number.';
  }
  if (
    code.includes('auth/captcha-check-failed') ||
    code.includes('captcha-check-failed') ||
    code.includes('captcha-expired') ||
    code.includes('missing-client-identifier') ||
    msg.includes('captcha-check-failed')
  ) {
    return 'Verification failed. Please try again.';
  }
  if (
    code.includes('auth/too-many-requests') ||
    code.includes('too-many-requests') ||
    msg.includes('too-many-requests')
  ) {
    return 'Too many OTP attempts. Please wait and try again later.';
  }
  if (
    code.includes('auth/quota-exceeded') ||
    code.includes('quota-exceeded') ||
    msg.includes('quota-exceeded')
  ) {
    return 'SMS quota exceeded. Please wait and try again later.';
  }
  if (
    code.includes('auth/app-not-authorized') ||
    code.includes('app-not-authorized') ||
    msg.includes('app-not-authorized')
  ) {
    return 'This app domain is not authorized for phone authentication. Please verify Firebase settings.';
  }
  if (
    code.includes('auth/network-request-failed') ||
    code.includes('network-request-failed') ||
    msg.includes('network-request-failed')
  ) {
    return 'Network error. Please check your internet connection and try again.';
  }
  if (
    code.includes('auth/operation-not-allowed') ||
    code.includes('operation-not-allowed') ||
    msg.includes('operation-not-allowed')
  ) {
    return 'Phone authentication is not enabled in Firebase. Please contact support.';
  }
  if (
    code.includes('auth/billing-not-enabled') ||
    code.includes('billing-not-enabled') ||
    msg.includes('billing-not-enabled')
  ) {
    return 'SMS service is currently unavailable (billing not enabled). Please try again later.';
  }
  if (
    code.includes('auth/invalid-verification-code') ||
    code.includes('invalid-verification-code') ||
    msg.includes('invalid-verification-code')
  ) {
    return 'Invalid OTP. Please check the OTP and try again.';
  }
  if (
    code.includes('auth/code-expired') ||
    code.includes('code-expired') ||
    code.includes('session-expired') ||
    msg.includes('code-expired') ||
    msg.includes('session-expired')
  ) {
    return 'This OTP has expired. Please request a new OTP.';
  }

  if (stage === 'VERIFY') {
    return 'Invalid OTP. Please check the OTP and try again.';
  }
  return 'OTP could not be sent. Please try again.';
}

// Firestore Error Handling Definition
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.debug('Firestore Notice: ', JSON.stringify(errInfo));
  return errInfo;
}

// Optional Non-Blocking Connection Validation
export async function testConnection(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!navigator.onLine) return false;
  try {
    if (!isFirebaseConfigured()) return false;
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    // Non-fatal connectivity negotiation: Firestore will operate in offline/cache mode until connected
    return false;
  }
}


