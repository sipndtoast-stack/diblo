import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let isFirebaseInitialized = false;
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;
let adminApp: App | null = null;

export function initializeFirebaseAdmin(): {
  isInitialized: boolean;
  db: Firestore | null;
  auth: Auth | null;
  error?: string;
} {
  if (isFirebaseInitialized && adminDb && adminAuth) {
    return { isInitialized: true, db: adminDb, auth: adminAuth };
  }

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!rawServiceAccount || rawServiceAccount.trim() === '') {
    console.warn(
      '[FIREBASE ADMIN] FIREBASE_SERVICE_ACCOUNT environment variable is not set. Operating in local memory fallback mode.'
    );
    return {
      isInitialized: false,
      db: null,
      auth: null,
      error: 'FIREBASE_SERVICE_ACCOUNT is not configured'
    };
  }

  try {
    let serviceAccount: any;

    if (typeof rawServiceAccount === 'string') {
      try {
        serviceAccount = JSON.parse(rawServiceAccount);
      } catch (parseError) {
        // Try base64 decode if applicable
        const decoded = Buffer.from(rawServiceAccount, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
      }
    } else {
      serviceAccount = rawServiceAccount;
    }

    // Normalize escaped newlines in private key
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error('Service account is missing required fields: project_id, client_email, or private_key');
    }

    const apps = getApps();
    if (apps.length === 0) {
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    } else {
      adminApp = apps[0];
    }

    adminDb = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);
    isFirebaseInitialized = true;

    console.log(`[FIREBASE ADMIN] Successfully connected to Firebase project: ${serviceAccount.project_id}`);
    return { isInitialized: true, db: adminDb, auth: adminAuth };
  } catch (err: any) {
    const safeErrorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[FIREBASE ADMIN] Initialization failed: ${safeErrorMsg}`);
    return {
      isInitialized: false,
      db: null,
      auth: null,
      error: safeErrorMsg
    };
  }
}

export { adminDb, adminAuth, isFirebaseInitialized };
