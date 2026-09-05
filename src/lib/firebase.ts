import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';

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

