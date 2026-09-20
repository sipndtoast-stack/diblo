import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
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
  apiKey: firebaseConfigData.apiKey || (import.meta.env.VITE_FIREBASE_API_KEY as string) || '',
  authDomain: firebaseConfigData.authDomain || (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || 'diblo-3944a.firebaseapp.com',
  projectId: firebaseConfigData.projectId || (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || 'diblo-3944a',
  storageBucket: firebaseConfigData.storageBucket || (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || 'diblo-3944a.firebasestorage.app',
  messagingSenderId: firebaseConfigData.messagingSenderId || (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || '650321096736',
  appId: firebaseConfigData.appId || (import.meta.env.VITE_FIREBASE_APP_ID as string) || '1:650321096736:web:218a11d36b1ca9e38c0c45',
  firestoreDatabaseId: (firebaseConfigData as any).firestoreDatabaseId
};

// Check if Firebase is fully configured with an API key
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey.trim().length > 0);
}

// Initialize Firebase App safely (singleton)
let appInstance: FirebaseApp;
if (getApps().length > 0) {
  appInstance = getApp();
} else {
  appInstance = initializeApp(firebaseConfigData);
}

export const firebaseApp: FirebaseApp = appInstance;
export const db: Firestore = (firebaseConfigData as any).firestoreDatabaseId
  ? getFirestore(appInstance, (firebaseConfigData as any).firestoreDatabaseId)
  : getFirestore(appInstance); /* CRITICAL: The app will break without this line */
export const auth: Auth = getAuth(appInstance);
export const oAuthClientId: string = (firebaseConfigData as any).oAuthClientId || '';

// Safely configure testing mode in development/preview containers so App Check doesn't break phone auth
if (typeof window !== 'undefined') {
  try {
    if (
      import.meta.env.DEV ||
      window.location.hostname.includes('run.app') ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    ) {
      auth.settings.appVerificationDisabledForTesting = true;
    }
  } catch {
    // ignore
  }
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
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


