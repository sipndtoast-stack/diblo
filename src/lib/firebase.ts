import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  UserCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged as fbOnAuthStateChanged,
  signOut as fbSignOut,
  browserLocalPersistence,
  setPersistence,
  User as FirebaseUser,
  NextOrObserver
} from 'firebase/auth';

export type { UserCredential, FirebaseUser };

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Client configuration pointing strictly to verified Firebase project diblo-3944a
export const firebaseConfig: FirebaseClientConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || '',
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || 'diblo-3944a.firebaseapp.com',
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || 'diblo-3944a',
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || 'diblo-3944a.appspot.com',
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || '439493514637',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || '1:439493514637:web:diblo3944a',
};

// Check if Firebase is fully configured with an API key
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey.trim().length > 0);
}

// Initialize Firebase App safely (singleton)
let appInstance: FirebaseApp | null = null;
try {
  if (getApps().length > 0) {
    appInstance = getApp();
  } else if (isFirebaseConfigured()) {
    appInstance = initializeApp(firebaseConfig);
  }
} catch (err) {
  console.warn('[Firebase App Init]', err);
}

export const firebaseApp: FirebaseApp | null = appInstance;

// Initialize Firebase Auth singleton
let authInstance: Auth | null = null;
if (appInstance && isFirebaseConfigured()) {
  try {
    authInstance = getAuth(appInstance);
    setPersistence(authInstance, browserLocalPersistence).catch((e) => {
      console.warn('[Firebase Auth Persistence Notice]', e);
    });
  } catch (err) {
    console.warn('[Firebase Auth Init]', err);
  }
}

export const auth: Auth | null = authInstance;

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    if (!isFirebaseConfigured()) {
      const error: any = new Error('Authentication configuration error: Firebase API key is missing or not configured.');
      error.code = 'auth/invalid-api-key';
      throw error;
    }
    if (!appInstance) {
      appInstance = initializeApp(firebaseConfig);
    }
    authInstance = getAuth(appInstance);
    setPersistence(authInstance, browserLocalPersistence).catch((e) => {
      console.warn('[Firebase Auth Persistence Notice]', e);
    });
  }
  return authInstance;
}

/**
 * Standard Firebase error mapping to provide clear, user-friendly feedback
 * and distinguish exact Firebase error codes rather than generic network errors.
 */
export function getFirebaseErrorMessage(error: any): { code: string; message: string; raw: string } {
  if (!error) {
    return {
      code: 'auth/unknown-error',
      message: 'Authentication failed. Please try again.',
      raw: ''
    };
  }

  const raw = String(error?.message || error || '');
  let code = String(error?.code || '');

  // If code is not set directly on error, attempt to extract from message e.g. (auth/invalid-credential)
  if (!code || code === 'undefined') {
    const match = raw.match(/\(auth\/([a-zA-Z0-9_-]+)\)/);
    if (match && match[1]) {
      code = `auth/${match[1]}`;
    } else if (raw.toLowerCase().includes('network') || raw.toLowerCase().includes('failed to fetch')) {
      code = 'auth/network-request-failed';
    } else if (raw.toLowerCase().includes('api key') || raw.toLowerCase().includes('api-key')) {
      code = 'auth/invalid-api-key';
    } else {
      code = 'auth/unknown-error';
    }
  }

  let message = '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      message = 'Invalid email or password';
      break;
    case 'auth/user-not-found':
      message = 'Account not found';
      break;
    case 'auth/too-many-requests':
      message = 'Too many login attempts';
      break;
    case 'auth/network-request-failed':
      message = 'Please check your internet connection';
      break;
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid':
    case 'auth/configuration-not-found':
      message = 'Authentication configuration error';
      break;
    case 'auth/operation-not-allowed':
      message = 'Email/Password sign-in is disabled in Firebase Console. Please enable it in Firebase Console.';
      break;
    case 'auth/unauthorized-domain': {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
      message = `Domain "${currentHost}" is not authorized. Please add it to Firebase Console > Authentication > Settings > Authorized domains.`;
      break;
    }
    case 'auth/invalid-email':
      message = 'Invalid email address. Please enter a valid email.';
      break;
    case 'auth/email-already-in-use':
      message = 'This email address is already registered. Please sign in instead.';
      break;
    case 'auth/weak-password':
      message = 'Password must be at least 6 characters.';
      break;
    case 'auth/user-disabled':
      message = 'This user account has been disabled.';
      break;
    case 'auth/popup-closed-by-user':
      message = 'Authentication popup was closed before completing.';
      break;
    default:
      message = error?.message ? error.message.replace(/^Firebase:\s*/, '') : 'Authentication failed.';
      break;
  }

  return { code, message, raw };
}

/**
 * Sign in with Email and Password using Firebase Auth
 */
export async function firebaseSignInWithEmail(email: string, pass: string): Promise<UserCredential> {
  const authClient = getFirebaseAuth();
  return await signInWithEmailAndPassword(authClient, email, pass);
}

/**
 * Create a new account with Email and Password using Firebase Auth
 */
export async function firebaseSignUpWithEmail(
  email: string,
  pass: string,
  displayName?: string
): Promise<UserCredential> {
  const authClient = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(authClient, email, pass);
  if (displayName && credential.user) {
    try {
      await updateProfile(credential.user, { displayName });
    } catch (e) {
      console.warn('[Firebase Auth] Failed to update displayName', e);
    }
  }
  return credential;
}

/**
 * Sign out from Firebase Auth
 */
export async function firebaseSignOut(authClient?: Auth | null): Promise<void> {
  const client = authClient || authInstance;
  if (!client) return;
  try {
    await fbSignOut(client);
  } catch (err) {
    console.warn('[Firebase Auth] Sign out notice:', err);
  }
}

/**
 * Firebase onAuthStateChanged listener wrapper
 */
export function onAuthStateChanged(
  authClient: Auth | null,
  observerOrNext: NextOrObserver<FirebaseUser | null>,
  onError?: (error: Error) => void,
  onCompleted?: () => void
): () => void {
  if (!authClient) {
    if (typeof observerOrNext === 'function') {
      observerOrNext(null);
    }
    return () => {};
  }
  try {
    return fbOnAuthStateChanged(authClient, observerOrNext, onError, onCompleted);
  } catch (err) {
    console.warn('[Firebase Auth] onAuthStateChanged error', err);
    if (typeof observerOrNext === 'function') {
      observerOrNext(null);
    }
    return () => {};
  }
}
