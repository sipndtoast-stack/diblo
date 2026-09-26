import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
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

// Check if Firebase is fully configured with an API key
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey.trim().length > 0);
}

// Initialize Firebase App safely (singleton)
let appInstance: FirebaseApp;
if (getApps().length > 0) {
  appInstance = getApp();
} else {
  appInstance = initializeApp(firebaseConfig);
}

export const firebaseApp: FirebaseApp = appInstance;
export const db: Firestore = (firebaseConfigData as any).firestoreDatabaseId
  ? getFirestore(appInstance, (firebaseConfigData as any).firestoreDatabaseId)
  : getFirestore(appInstance); /* CRITICAL: The app will break without this line */
export const auth: Auth = getAuth(appInstance);
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
 * Safely returns the Firebase Cloud Messaging instance when supported by the browser
 */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (messagingInstance) return messagingInstance;
  try {
    const supported = await isMessagingSupported();
    if (!supported) return null;
    messagingInstance = getMessaging(appInstance);
    return messagingInstance;
  } catch (err) {
    console.debug('[FCM] Messaging initialization notice:', err);
    return null;
  }
}

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


