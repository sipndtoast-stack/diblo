import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  onAuthStateChanged as fbOnAuthStateChanged,
  signOut as fbSignOut,
  User as FirebaseUser,
  NextOrObserver
} from 'firebase/auth';

// Standard Firebase Client Configuration for Diblo Platform
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDibloUrbanAssistanceMumbai2026',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'diblo-39440.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'diblo-39440',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'diblo-39440.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '439493514637',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:439493514637:web:diblo39440app',
};

// Initialize Firebase App safely (singleton)
export const firebaseApp: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth: Auth = getAuth(firebaseApp);

/**
 * Firebase onAuthStateChanged listener wrapper
 * Acts as the authoritative source of truth for authentication state.
 */
export function onAuthStateChanged(
  authInstance: Auth,
  observerOrNext: NextOrObserver<FirebaseUser | null>,
  onError?: (error: Error) => void,
  onCompleted?: () => void
): () => void {
  try {
    return fbOnAuthStateChanged(authInstance, observerOrNext, onError, onCompleted);
  } catch (err) {
    console.warn('[Firebase Auth] onAuthStateChanged fallback registration', err);
    // If native listener throws due to offline sandbox, invoke observer with null
    if (typeof observerOrNext === 'function') {
      observerOrNext(null);
    }
    return () => {};
  }
}

/**
 * Sign out from Firebase Auth
 */
export async function firebaseSignOut(authInstance: Auth = auth): Promise<void> {
  try {
    await fbSignOut(authInstance);
  } catch (err) {
    console.warn('[Firebase Auth] Sign out notice:', err);
  }
}
