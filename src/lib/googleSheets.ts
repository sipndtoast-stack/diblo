import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, oAuthClientId } from './firebase';
import { Booking, AssistantProfile, AssistantApplication, PlatformAnalytics } from '../types';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly'
];

// IN-MEMORY TOKEN CACHING ONLY (Mandatory security requirement: No localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let googleUserEmail: string | null = null;
let googleUserName: string | null = null;
let googleUserPhoto: string | null = null;

// Dynamically load Google Identity Services client script if needed
async function loadGsiScript(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if ((window as any).google?.accounts?.oauth2) return true;

  return new Promise((resolve) => {
    const existing = document.getElementById('google-gsi-client');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

// Request access token via Google Identity Services (GSI) Token Client
async function requestGsiToken(clientId: string): Promise<{
  success: boolean;
  accessToken?: string;
  email?: string;
  name?: string;
  photo?: string;
  error?: string;
}> {
  return new Promise(async (resolve) => {
    try {
      const loaded = await loadGsiScript();
      if (!loaded || !(window as any).google?.accounts?.oauth2) {
        resolve({ success: false, error: 'Google Identity Services library failed to load.' });
        return;
      }

      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: WORKSPACE_SCOPES.join(' '),
        callback: async (response: any) => {
          if (response.error) {
            resolve({ success: false, error: response.error_description || response.error });
            return;
          }
          const accessToken = response.access_token;
          if (!accessToken) {
            resolve({ success: false, error: 'No access token received from Google.' });
            return;
          }

          let profileInfo: any = {};
          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (userInfoRes.ok) {
              profileInfo = await userInfoRes.json();
            }
          } catch {
            // non-fatal
          }

          resolve({
            success: true,
            accessToken,
            email: profileInfo.email,
            name: profileInfo.name,
            photo: profileInfo.picture
          });
        },
        error_callback: (err: any) => {
          resolve({ success: false, error: err?.message || 'Google authorization was closed or denied.' });
        }
      });

      client.requestAccessToken({ prompt: 'consent' });
    } catch (e: any) {
      resolve({ success: false, error: e?.message || 'Failed to initialize Google token client.' });
    }
  });
}

// Clear cached token automatically when user signs out
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedAccessToken = null;
    googleUserEmail = null;
    googleUserName = null;
    googleUserPhoto = null;
  } else {
    googleUserEmail = user.email || null;
    googleUserName = user.displayName || null;
    googleUserPhoto = user.photoURL || null;
  }
});

export function getCachedGoogleToken(): string | null {
  return cachedAccessToken;
}

export function setCachedGoogleToken(token: string | null): void {
  cachedAccessToken = token;
}

export function getGoogleAccountInfo() {
  return {
    email: googleUserEmail || auth.currentUser?.email || null,
    name: googleUserName || auth.currentUser?.displayName || null,
    photo: googleUserPhoto || auth.currentUser?.photoURL || null,
    isConnected: Boolean(cachedAccessToken)
  };
}

/**
 * Sign in with Google requesting Google Sheets & Drive OAuth scopes
 */
export async function connectGoogleWorkspace(): Promise<{
  success: boolean;
  accessToken?: string;
  user?: FirebaseUser;
  error?: string;
}> {
  // First, attempt standard Firebase signInWithPopup (without access_type: 'offline')
  try {
    const provider = new GoogleAuthProvider();
    for (const scope of WORKSPACE_SCOPES) {
      provider.addScope(scope);
    }
    // Only pass prompt: 'consent'; access_type: 'offline' causes auth/internal-error in client popups
    provider.setCustomParameters({
      prompt: 'consent'
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (token) {
      cachedAccessToken = token;
      googleUserEmail = result.user.email;
      googleUserName = result.user.displayName;
      googleUserPhoto = result.user.photoURL;
      return { success: true, accessToken: token, user: result.user };
    }
  } catch (err: any) {
    console.warn('[Google Workspace] Firebase signInWithPopup notice:', err);

    // If Firebase Auth encounters internal-error (common in cross-origin iframes),
    // immediately attempt Google Identity Services (GSI) Token Client fallback
    if (oAuthClientId && typeof window !== 'undefined') {
      try {
        const gsiResult = await requestGsiToken(oAuthClientId);
        if (gsiResult.success && gsiResult.accessToken) {
          cachedAccessToken = gsiResult.accessToken;
          googleUserEmail = gsiResult.email || null;
          googleUserName = gsiResult.name || null;
          googleUserPhoto = gsiResult.photo || null;

          const mockOrRealUser = auth.currentUser || ({
            uid: `google-${Date.now()}`,
            email: gsiResult.email,
            displayName: gsiResult.name,
            photoURL: gsiResult.photo,
            emailVerified: true
          } as unknown as FirebaseUser);

          return {
            success: true,
            accessToken: gsiResult.accessToken,
            user: mockOrRealUser
          };
        } else if (gsiResult.error && !gsiResult.error.includes('closed or denied')) {
          console.warn('[Google Workspace] GSI fallback notice:', gsiResult.error);
        }
      } catch (gsiErr) {
        console.warn('[Google Workspace] GSI fallback exception:', gsiErr);
      }
    }

    console.error('Failed to connect Google Workspace:', err);
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;
    const errCode = (err?.code || '').toLowerCase();
    const errMsg = (err?.message || '').toLowerCase();

    let friendlyError = 'Authentication failed or popup was closed.';
    if (errCode.includes('internal-error') || errMsg.includes('internal-error')) {
      friendlyError = isIframe
        ? 'Google sign-in popup was restricted by browser iframe security. Please allow popups or open the app in a new tab.'
        : 'Google Authentication encountered an internal error. Please check third-party cookie permissions or retry.';
    } else if (errCode.includes('popup-closed-by-user') || errMsg.includes('popup-closed')) {
      friendlyError = 'Sign-in popup was closed before completing authorization.';
    } else if (err?.message) {
      friendlyError = err.message;
    }

    return {
      success: false,
      error: friendlyError
    };
  }

  return { success: false, error: 'Google sign-in did not return an access token.' };
}

/**
 * Disconnect Google Workspace by clearing in-memory token
 */
export async function disconnectGoogleWorkspace(): Promise<void> {
  cachedAccessToken = null;
  googleUserEmail = null;
  googleUserName = null;
  googleUserPhoto = null;
}

/**
 * Helper to extract spreadsheet ID from either a full Google Sheets URL or raw ID
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export interface DriveFileItem {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

/**
 * Search user's Google Drive for spreadsheets
 */
export async function fetchUserSpreadsheets(token?: string): Promise<DriveFileItem[]> {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Not authenticated with Google Workspace. Please sign in first.');

  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const fields = encodeURIComponent('files(id, name, modifiedTime, webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime%20desc&pageSize=25`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${activeToken}`
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Google Drive API error: ${res.statusText}`);
  }

  const data = await res.json();
  return data.files || [];
}

export interface SpreadsheetTab {
  sheetId: number;
  title: string;
  index: number;
  rowCount?: number;
  columnCount?: number;
}

export interface SpreadsheetDetails {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheets: SpreadsheetTab[];
}

/**
 * Get spreadsheet metadata including tab names and properties
 */
export async function fetchSpreadsheetDetails(spreadsheetId: string, token?: string): Promise<SpreadsheetDetails> {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Not authenticated with Google Workspace. Please sign in first.');

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${activeToken}`
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to fetch spreadsheet details: ${res.statusText}`);
  }

  const data = await res.json();
  const sheets: SpreadsheetTab[] = (data.sheets || []).map((s: any) => ({
    sheetId: s.properties?.sheetId,
    title: s.properties?.title || 'Sheet1',
    index: s.properties?.index || 0,
    rowCount: s.properties?.gridProperties?.rowCount,
    columnCount: s.properties?.gridProperties?.columnCount
  }));

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Untitled Spreadsheet',
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}`,
    sheets
  };
}

/**
 * Read row values from a spreadsheet range (e.g. 'Sheet1!A1:Z50' or 'Bookings')
 */
export async function fetchSheetValues(spreadsheetId: string, range: string, token?: string): Promise<string[][]> {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Not authenticated with Google Workspace. Please sign in first.');

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodedRange}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${activeToken}`
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to read sheet values: ${res.statusText}`);
  }

  const data = await res.json();
  return data.values || [];
}

/**
 * Create a brand new Diblo Operations Spreadsheet in user's Google Drive
 */
export async function createDibloSpreadsheet(
  customTitle?: string,
  token?: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Not authenticated with Google Workspace. Please sign in first.');

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const title = customTitle || `Diblo Mumbai Operations & Data (${dateStr})`;

  const payload = {
    properties: {
      title
    },
    sheets: [
      {
        properties: {
          title: 'Bookings',
          gridProperties: { rowCount: 100, columnCount: 15, frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: 'Staff Details',
          gridProperties: { rowCount: 100, columnCount: 12, frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: 'Applications',
          gridProperties: { rowCount: 100, columnCount: 15, frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: 'Summary & Stats',
          gridProperties: { rowCount: 50, columnCount: 10, frozenRowCount: 1 }
        }
      }
    ]
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${activeToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to create spreadsheet: ${res.statusText}`);
  }

  const created = await res.json();
  const sheetId = created.spreadsheetId;

  // Populate initial headers
  await updateSheetValues(
    sheetId,
    'Bookings!A1:K1',
    [[
      'Booking ID',
      'Customer Name',
      'Phone Number',
      'Service Booked',
      'Mumbai Area',
      'Start Time',
      'Duration (Hours)',
      'Total Amount (INR)',
      'Status',
      'Payment Status',
      'Assistant Assigned'
    ]],
    activeToken
  );

  await updateSheetValues(
    sheetId,
    'Staff Details!A1:H1',
    [[
      'EPL ID',
      'Name',
      'Phone Number',
      'Role',
      'Operating Area',
      'Verification Status',
      'Police Verified',
      'Rating'
    ]],
    activeToken
  );

  await updateSheetValues(
    sheetId,
    'Applications!A1:H1',
    [[
      'Application Number',
      'Full Name',
      'Mobile Number',
      'Mumbai Area',
      'Gender',
      'Years Experience',
      'Status',
      'Applied Date'
    ]],
    activeToken
  );

  await updateSheetValues(
    sheetId,
    'Summary & Stats!A1:C1',
    [[
      'Metric Name',
      'Current Value',
      'Last Synchronized'
    ]],
    activeToken
  );

  return {
    spreadsheetId: sheetId,
    spreadsheetUrl: created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${sheetId}`,
    title
  };
}

/**
 * Update cell values in a specified range
 */
export async function updateSheetValues(
  spreadsheetId: string,
  range: string,
  values: any[][],
  token?: string
): Promise<{ updatedRows: number; updatedColumns: number; updatedCells: number }> {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Not authenticated with Google Workspace. Please sign in first.');

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodedRange}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${activeToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to update spreadsheet: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    updatedRows: data.updatedRows || 0,
    updatedColumns: data.updatedColumns || 0,
    updatedCells: data.updatedCells || 0
  };
}

/**
 * Append rows to a sheet
 */
export async function appendSheetValues(
  spreadsheetId: string,
  range: string,
  values: any[][],
  token?: string
): Promise<{ updatedRows: number; updatedCells: number }> {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) throw new Error('Not authenticated with Google Workspace. Please sign in first.');

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${activeToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to append rows: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    updatedRows: data.updates?.updatedRows || 0,
    updatedCells: data.updates?.updatedCells || 0
  };
}

/**
 * Export all Bookings into a Google Sheet tab
 */
export async function exportBookingsToGoogleSheet(
  spreadsheetId: string,
  bookings: Booking[],
  sheetName: string = 'Bookings',
  token?: string
): Promise<{ count: number; updatedCells: number }> {
  const rows: any[][] = [
    [
      'Booking ID',
      'Customer Name',
      'Phone Number',
      'Service Booked',
      'Mumbai Area',
      'Address',
      'Start Time',
      'Hours',
      'Total Amount (INR)',
      'Status',
      'Payment Status',
      'Assistant Assigned',
      'Created At'
    ],
    ...bookings.map((b) => [
      b.id,
      b.customerName || 'Customer',
      b.customerPhone || 'N/A',
      b.serviceName || b.serviceId || 'General Assistant',
      b.location?.area || 'Mumbai',
      b.location?.address || '',
      b.startTime || '',
      b.bookedHours || b.totalHours || 2,
      b.totalAmount || 0,
      b.status || 'PENDING',
      b.paymentStatus || 'PENDING',
      b.assistantName || b.assistantId || 'Unassigned',
      b.createdAt || new Date().toISOString()
    ])
  ];

  const res = await updateSheetValues(spreadsheetId, `${sheetName}!A1:M${rows.length}`, rows, token);
  return { count: bookings.length, updatedCells: res.updatedCells };
}

/**
 * Export Assistants and Staff details to Google Sheet
 */
export async function exportStaffToGoogleSheet(
  spreadsheetId: string,
  assistants: AssistantProfile[],
  sheetName: string = 'Staff Details',
  token?: string
): Promise<{ count: number; updatedCells: number }> {
  const rows: any[][] = [
    [
      'Assistant ID',
      'Name',
      'Phone Number',
      'Email',
      'Operating Area',
      'Verification Status',
      'Police Verified',
      'Rating',
      'Total Jobs Completed',
      'Online Status'
    ],
    ...assistants.map((a) => [
      a.id,
      a.name,
      a.phone,
      a.email || 'N/A',
      Array.isArray(a.serviceArea) ? a.serviceArea.join(', ') : 'Mumbai',
      a.verificationStatus || 'PENDING',
      a.policeVerified ? 'VERIFIED' : 'PENDING',
      a.rating || 5.0,
      a.totalRatings || 0,
      a.isOnline ? 'ONLINE' : 'OFFLINE'
    ])
  ];

  const res = await updateSheetValues(spreadsheetId, `${sheetName}!A1:J${rows.length}`, rows, token);
  return { count: assistants.length, updatedCells: res.updatedCells };
}

/**
 * Export Assistant Applications to Google Sheet
 */
export async function exportApplicationsToGoogleSheet(
  spreadsheetId: string,
  applications: AssistantApplication[],
  sheetName: string = 'Applications',
  token?: string
): Promise<{ count: number; updatedCells: number }> {
  const rows: any[][] = [
    [
      'Application ID',
      'Application Number',
      'Full Name',
      'Mobile Number',
      'Email',
      'Mumbai Area',
      'Gender',
      'Years Experience',
      'Two Wheeler',
      'Driving License',
      'Status',
      'Applied Date'
    ],
    ...applications.map((app) => [
      app.id,
      app.applicationNumber || app.id,
      app.fullName,
      app.mobileNumber,
      app.email || 'N/A',
      app.mumbaiArea || 'Mumbai',
      app.gender || 'N/A',
      app.yearsOfExperience || 0,
      app.hasTwoWheeler ? 'YES' : 'NO',
      app.drivingLicenseNumber || 'N/A',
      app.status || 'PENDING_REVIEW',
      app.appliedAt || new Date().toISOString()
    ])
  ];

  const res = await updateSheetValues(spreadsheetId, `${sheetName}!A1:L${rows.length}`, rows, token);
  return { count: applications.length, updatedCells: res.updatedCells };
}

/**
 * Export Platform Summary to Google Sheet
 */
export async function exportAnalyticsToGoogleSheet(
  spreadsheetId: string,
  analytics: PlatformAnalytics | null,
  totalBookings: number,
  totalAssistants: number,
  sheetName: string = 'Summary & Stats',
  token?: string
): Promise<{ updatedCells: number }> {
  const now = new Date().toISOString();
  const rows: any[][] = [
    ['Metric Name', 'Value', 'Last Synchronized'],
    ['Total Bookings Count', totalBookings, now],
    ['Total Registered Assistants', totalAssistants, now],
    ['Total Revenue (INR)', analytics?.totalRevenue || 0, now],
    ['Active Bookings Today', analytics?.activeBookings || 0, now],
    ['Completed Bookings', analytics?.completedBookings || 0, now],
    ['Average Customer Rating', analytics?.averageRating || 4.8, now],
    ['Platform Target Region', 'Mumbai Metropolitan Region', now]
  ];

  const res = await updateSheetValues(spreadsheetId, `${sheetName}!A1:C${rows.length}`, rows, token);
  return { updatedCells: res.updatedCells };
}

export interface ParsedStaffMember {
  name: string;
  phone: string;
  role?: string;
  area?: string;
  policeVerified?: boolean;
}

/**
 * Read and parse Staff Details rows from a Google Sheet
 */
export async function parseStaffDetailsFromSheet(
  spreadsheetId: string,
  sheetName: string = 'Staff Details',
  token?: string
): Promise<ParsedStaffMember[]> {
  const rows = await fetchSheetValues(spreadsheetId, `${sheetName}!A2:H100`, token);
  if (!rows || rows.length === 0) return [];

  return rows
    .map((row) => {
      // Row columns typically: [ID, Name, Phone, Role, Area, Status, Police, Rating]
      const name = row[1] ? String(row[1]).trim() : '';
      const phone = row[2] ? String(row[2]).replace(/\D/g, '').slice(-10) : '';
      const role = row[3] ? String(row[3]).trim() : 'Assistant';
      const area = row[4] ? String(row[4]).trim() : 'Mumbai';
      const policeVerified = row[6] ? String(row[6]).toLowerCase().includes('verif') : false;

      return { name, phone, role, area, policeVerified };
    })
    .filter((s) => s.name && s.phone.length === 10);
}
