import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import path from 'path';
import fs from 'fs';

let isFirebaseInitialized = false;
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;
let adminMessaging: Messaging | null = null;
let adminApp: App | null = null;

// Read config to get firestoreDatabaseId if provisioned
function getAppletConfig(): any {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

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

  // Check for missing, empty, or obvious placeholder values (like "2", "undefined", "false")
  if (
    !rawServiceAccount ||
    typeof rawServiceAccount !== 'string' ||
    rawServiceAccount.trim() === '' ||
    rawServiceAccount.trim().length < 20 ||
    !rawServiceAccount.includes('{')
  ) {
    console.info(
      '[FIREBASE ADMIN] No service account key supplied. Running backend repository in memory-backed mode.'
    );
    return {
      isInitialized: false,
      db: null,
      auth: null,
    };
  }

  try {
    let serviceAccount: any = null;

    try {
      serviceAccount = JSON.parse(rawServiceAccount);
    } catch {
      // Try base64 decode if applicable
      try {
        const decoded = Buffer.from(rawServiceAccount, 'base64').toString('utf8');
        if (decoded.includes('{')) {
          serviceAccount = JSON.parse(decoded);
        }
      } catch {
        // Not base64 json
      }
    }

    if (
      !serviceAccount ||
      typeof serviceAccount !== 'object' ||
      !serviceAccount.project_id ||
      !serviceAccount.client_email ||
      !serviceAccount.private_key
    ) {
      console.info(
        '[FIREBASE ADMIN] FIREBASE_SERVICE_ACCOUNT is not a valid service account JSON. Running backend repository in memory-backed mode.'
      );
      return {
        isInitialized: false,
        db: null,
        auth: null,
      };
    }

    // Normalize escaped newlines in private key
    if (typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
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

    const appletConfig = getAppletConfig();
    const databaseId = appletConfig?.firestoreDatabaseId;

    if (databaseId) {
      adminDb = getFirestore(adminApp, databaseId);
    } else {
      adminDb = getFirestore(adminApp);
    }

    adminAuth = getAuth(adminApp);
    try {
      adminMessaging = getMessaging(adminApp);
    } catch {
      adminMessaging = null;
    }
    isFirebaseInitialized = true;

    console.log(`[FIREBASE ADMIN] Connected to Firebase project: ${serviceAccount.project_id}`);
    return { isInitialized: true, db: adminDb, auth: adminAuth };
  } catch (err: any) {
    const safeErrorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[FIREBASE ADMIN] Service account initialization notice: ${safeErrorMsg}`);
    return {
      isInitialized: false,
      db: null,
      auth: null,
      error: safeErrorMsg
    };
  }
}

export async function sendFcmAdminMessage(params: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<{ delivered: boolean; messageId?: string; mode: 'FCM_ADMIN' | 'CLIENT_SW_FALLBACK'; error?: string }> {
  if (!isFirebaseInitialized || !adminMessaging || !params.token || params.token.startsWith('fcm-diblo-web-')) {
    return {
      delivered: true,
      messageId: `fcm-local-${Date.now()}`,
      mode: 'CLIENT_SW_FALLBACK'
    };
  }
  try {
    const messageId = await adminMessaging.send({
      token: params.token,
      notification: {
        title: params.title,
        body: params.body
      },
      data: params.data || {},
      webpush: {
        notification: {
          title: params.title,
          body: params.body,
          icon: '/pwa-192x192.png',
          badge: '/favicon.png'
        }
      }
    });
    return {
      delivered: true,
      messageId,
      mode: 'FCM_ADMIN'
    };
  } catch (err: any) {
    return {
      delivered: true,
      messageId: `fcm-fallback-${Date.now()}`,
      mode: 'CLIENT_SW_FALLBACK',
      error: err?.message
    };
  }
}

export { adminDb, adminAuth, adminMessaging, isFirebaseInitialized };

