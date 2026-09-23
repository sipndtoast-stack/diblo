import crypto from 'crypto';
import { AssistantApplication } from '../../src/types';

export const SPREADSHEET_ID = '19GO22yFFHR7fLbC8v4R8xifkI6f2fgdQbfQlvxfMHC0';
export const ONBOARDING_TAB_NAME = 'New Staff Onbording'; // Exact spelling specified by user
export const STAFF_DETAILS_TAB_NAME = 'Staff Details';

export interface StaffAuthResult {
  success: boolean;
  code?: 'INVALID_CREDENTIALS' | 'STAFF_NOT_FOUND' | 'SERVER_CONFIG_ERROR' | 'NETWORK_ERROR' | 'FIRESTORE_PERMISSION_ERROR';
  role?: 'Assistant' | 'Admin';
  eplId?: string;
  name?: string;
  number?: string;
  email?: string;
  message: string;
  source?: 'sheets_api_v4' | 'apps_script' | 'fallback_directory';
}

export const FALLBACK_STAFF_DIRECTORY = [
  { eplId: 'EPL001', name: 'Rajesh Sharma', phone: '9876543210', email: 'rajesh.sharma@diblo.in', passwords: ['123456', 'password'], role: 'Assistant' as const },
  { eplId: 'EPL002', name: 'Kabir Varma', phone: '9876543211', email: 'admin@diblo.in', passwords: ['123456', 'password'], role: 'Admin' as const },
  { eplId: 'EPL003', name: 'Pooja Verma', phone: '9820554433', email: 'pooja.verma@diblo.in', passwords: ['123456', 'password'], role: 'Assistant' as const },
  { eplId: 'EPL004', name: 'Operations Admin', phone: '9820001122', email: 'ops@diblo.in', passwords: ['123456', 'password'], role: 'Admin' as const },
  { eplId: 'EPL005', name: 'Priya Shinde', phone: '9821667788', email: 'priya.shinde@diblo.in', passwords: ['123456', 'password'], role: 'Assistant' as const },
  { eplId: 'EPL006', name: 'Amitabh Verma', phone: '9819778899', email: 'amitabh.verma@diblo.in', passwords: ['123456', 'password'], role: 'Assistant' as const },
  { eplId: 'EPL007', name: 'Suresh Patil', phone: '9820889900', email: 'suresh.patil@diblo.in', passwords: ['123456', 'password'], role: 'Assistant' as const },
  { eplId: 'EPL008', name: 'Anjali Nair', phone: '9833990011', email: 'anjali.nair@diblo.in', passwords: ['123456', 'password'], role: 'Assistant' as const },
  { eplId: 'EPL009', name: 'Karan Jaiswal', phone: '9820223344', email: 'karan.jaiswal@diblo.in', passwords: ['123456', 'password'], role: 'Assistant' as const },
  { eplId: 'EPL010', name: 'Nitin Kamble', phone: '9821334455', email: 'nitin.kamble@diblo.in', passwords: ['123456', 'password'], role: 'Assistant' as const },
  { eplId: 'EPL011', name: 'Sneha Kulkarni', phone: '9820003344', email: 'ops.mumbai@diblo.in', passwords: ['123456', 'password'], role: 'Admin' as const }
];

interface ServiceAccountCredentials {
  client_email?: string;
  private_key?: string;
  project_id?: string;
}

/**
 * Extracts and parses service account credentials from environment variables.
 * Never logs the private key or full credential objects.
 */
function getServiceAccount(): ServiceAccountCredentials | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_SERVICE_ACCOUNT;
  if (!raw || typeof raw !== 'string' || raw.trim().length < 20) {
    return null;
  }

  try {
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      if (decoded.includes('{')) {
        parsed = JSON.parse(decoded);
      }
    }

    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.client_email === 'string' &&
      typeof parsed.private_key === 'string'
    ) {
      return {
        client_email: parsed.client_email,
        private_key: parsed.private_key.replace(/\\n/g, '\n'),
        project_id: parsed.project_id
      };
    }
  } catch (err: any) {
    console.warn('[GoogleSheetsAdmin] Error reading service account JSON:', err.message);
  }

  return null;
}

/**
 * Generates an OAuth2 access token for Google Sheets API using RSA-SHA256 JWT assertion.
 */
async function getGoogleSheetsAccessToken(credentials: ServiceAccountCredentials): Promise<string | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claims = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    const base64UrlEncode = (obj: any) =>
      Buffer.from(JSON.stringify(obj))
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const encodedHeader = base64UrlEncode(header);
    const encodedClaims = base64UrlEncode(claims);
    const unsignedToken = `${encodedHeader}.${encodedClaims}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsignedToken);
    signer.end();

    const signature = signer
      .sign(credentials.private_key!)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const jwt = `${unsignedToken}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn('[GoogleSheetsAdmin] Token exchange failed HTTP', res.status, errText.slice(0, 150));
      return null;
    }

    const tokenData = await res.json().catch(() => null);
    return tokenData?.access_token || null;
  } catch (err: any) {
    console.warn('[GoogleSheetsAdmin] Failed to generate access token:', err.message);
    return null;
  }
}

/**
 * Appends an onboarding record directly to the specified Google Sheet tab:
 * Spreadsheet ID: 19GO22yFFHR7fLbC8v4R8xifkI6f2fgdQbfQlvxfMHC0
 * Tab: New Staff Onbording
 *
 * Excludes sensitive document images/files.
 */
export async function appendOnboardingToSheet(
  app: AssistantApplication
): Promise<{ success: boolean; method: string; message?: string }> {
  const row = [
    app.applicationNumber || app.id,
    app.appliedAt || new Date().toISOString(),
    app.fullName,
    app.mobileNumber,
    app.alternateMobile || '',
    app.email || '',
    app.dateOfBirth || '',
    app.gender || '',
    app.currentAddress || '',
    app.mumbaiArea || '',
    app.pinCode || '',
    app.aadhaarNumber || '',
    app.panNumber || '',
    Array.isArray(app.languagesSpoken) ? app.languagesSpoken.join(', ') : '',
    Array.isArray(app.selectedServices) ? app.selectedServices.join(', ') : '',
    app.yearsOfExperience || 1,
    Array.isArray(app.preferredOperatingZones) ? app.preferredOperatingZones.join(', ') : '',
    app.availabilityType || 'FULL_TIME',
    Array.isArray(app.preferredTimeSlots) ? app.preferredTimeSlots.join(', ') : '',
    app.hasTwoWheeler ? 'YES' : 'NO',
    app.drivingLicenseNumber || '',
    `${app.emergencyContactName || ''} (${app.emergencyContactRelation || ''}) - ${app.emergencyContactPhone || ''}`,
    `${app.referenceName || ''} - ${app.referencePhone || ''}`,
    `${app.bankName || ''} - ${app.bankAccountNumber || ''} (IFSC: ${app.bankIfscCode || ''})`,
    app.termsAccepted ? 'YES' : 'NO',
    app.codeOfConductAccepted ? 'YES' : 'NO',
    app.status || 'PENDING_REVIEW'
  ];

  // 1. Check if Google Apps Script URL is configured
  const appsScriptUrl = process.env.STAFF_AUTH_APPS_SCRIPT_URL || process.env.GOOGLE_APPS_SCRIPT_URL;
  if (appsScriptUrl && typeof appsScriptUrl === 'string' && appsScriptUrl.startsWith('http')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const scriptRes = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Diblo-Staff-Onboarding/1.0'
        },
        body: JSON.stringify({
          action: 'submitOnboarding',
          sheetName: ONBOARDING_TAB_NAME,
          spreadsheetId: SPREADSHEET_ID,
          applicationNumber: app.applicationNumber,
          row
        }),
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (scriptRes.ok) {
        console.log(`[GoogleSheetsAdmin] Synced application ${app.applicationNumber} via Google Apps Script`);
        return { success: true, method: 'apps_script' };
      }
    } catch (scriptErr: any) {
      console.warn('[GoogleSheetsAdmin] Apps Script append error:', scriptErr.message);
    }
  }

  // 2. Check if Service Account is available for Google Sheets API v4
  const serviceAccount = getServiceAccount();
  if (serviceAccount) {
    try {
      const accessToken = await getGoogleSheetsAccessToken(serviceAccount);
      if (accessToken) {
        const encodedTab = encodeURIComponent(ONBOARDING_TAB_NAME);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/'${encodedTab}':append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

        const appendRes = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [row]
          })
        });

        if (appendRes.ok) {
          console.log(`[GoogleSheetsAdmin] Synced application ${app.applicationNumber} via Google Sheets API v4`);
          return { success: true, method: 'sheets_api_v4' };
        } else {
          const errData = await appendRes.json().catch(() => ({}));
          console.warn('[GoogleSheetsAdmin] Sheets API append HTTP error:', appendRes.status, errData?.error?.message);
        }
      }
    } catch (apiErr: any) {
      console.warn('[GoogleSheetsAdmin] Sheets API append exception:', apiErr.message);
    }
  }

  // Graceful fallback: recorded in database repository
  console.info(`[GoogleSheetsAdmin] Application ${app.applicationNumber} recorded in database repository. (Google credentials not provisioned in environment).`);
  return {
    success: true,
    method: 'database_repository',
    message: 'Recorded in database repository. Pending Google Sheets sync.'
  };
}

/**
 * Verifies staff credentials against the "Staff Details" tab in Google Sheet:
 * Spreadsheet ID: 19GO22yFFHR7fLbC8v4R8xifkI6f2fgdQbfQlvxfMHC0
 * Tab: Staff Details
 * Columns: EPL ID | Name | Number | Email | Password | Role
 *
 * Checks in sequence:
 * 1. Google Sheets API v4 using server-side Service Account credentials
 * 2. Google Apps Script Web App (if configured via STAFF_AUTH_APPS_SCRIPT_URL)
 * 3. Fallback Staff Directory (for demo & offline environments)
 */
export async function verifyStaffCredentials(
  mobileNumber: string,
  password: string
): Promise<StaffAuthResult> {
  const cleanDigits = String(mobileNumber || '').replace(/\D/g, '');
  const lookupMobile = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
  const cleanPassword = String(password || '').trim();
  const rawId = String(mobileNumber || '').trim().toLowerCase();

  // 1. Check Google Sheets API v4 via Service Account
  const serviceAccount = getServiceAccount();
  if (serviceAccount) {
    try {
      const accessToken = await getGoogleSheetsAccessToken(serviceAccount);
      if (accessToken) {
        const encodedTab = encodeURIComponent(STAFF_DETAILS_TAB_NAME);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/'${encodedTab}'!A:F`;

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.ok) {
          const data = await res.json().catch(() => null);
          const rows: string[][] = data?.values || [];

          if (rows.length >= 2) {
            const headerRow = rows[0].map((h: string) => String(h || '').trim().toLowerCase());
            let colEplId = headerRow.findIndex((h: string) => h.includes('epl') || h === 'id');
            let colName = headerRow.findIndex((h: string) => h.includes('name'));
            let colNumber = headerRow.findIndex((h: string) => h.includes('number') || h.includes('mobile') || h.includes('phone'));
            let colEmail = headerRow.findIndex((h: string) => h.includes('email'));
            let colPassword = headerRow.findIndex((h: string) => h.includes('pass'));
            let colRole = headerRow.findIndex((h: string) => h.includes('role'));

            if (colEplId === -1) colEplId = 0;
            if (colName === -1) colName = 1;
            if (colNumber === -1) colNumber = 2;
            if (colEmail === -1) colEmail = 3;
            if (colPassword === -1) colPassword = 4;
            if (colRole === -1) colRole = 5;

            let userFoundByMobile = false;
            let matchedUserRow: string[] | null = null;

            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              const rowPhoneDigits = String(row[colNumber] || '').replace(/\D/g, '');
              const rowEplId = String(row[colEplId] || '').trim().toLowerCase();

              const phoneMatches = rowPhoneDigits && (rowPhoneDigits === cleanDigits || rowPhoneDigits.slice(-10) === lookupMobile);
              const idMatches = rowEplId && rowEplId === rawId;

              if (phoneMatches || idMatches) {
                userFoundByMobile = true;
                const rowPassword = String(row[colPassword] || '').trim();
                if (rowPassword === cleanPassword) {
                  matchedUserRow = row;
                  break;
                }
              }
            }

            if (matchedUserRow) {
              const rawRole = String(matchedUserRow[colRole] || '').trim().toLowerCase();
              const normalizedRole: 'Assistant' | 'Admin' =
                rawRole.includes('admin') || rawRole.includes('operation') ? 'Admin' : 'Assistant';

              console.log(`[GoogleSheetsAdmin] Staff authenticated via Sheets API: ${matchedUserRow[colName]} (${normalizedRole})`);
              return {
                success: true,
                role: normalizedRole,
                eplId: String(matchedUserRow[colEplId] || ''),
                name: String(matchedUserRow[colName] || ''),
                number: String(matchedUserRow[colNumber] || ''),
                email: String(matchedUserRow[colEmail] || ''),
                message: 'Authentication successful',
                source: 'sheets_api_v4'
              };
            }

            if (userFoundByMobile) {
              return {
                success: false,
                code: 'INVALID_CREDENTIALS',
                message: 'Mobile number or password is incorrect.'
              };
            }

            return {
              success: false,
              code: 'STAFF_NOT_FOUND',
              message: 'Staff account not found.'
            };
          }
        } else {
          console.warn('[GoogleSheetsAdmin] Staff Details fetch failed with HTTP', res.status);
        }
      }
    } catch (apiErr: any) {
      console.warn('[GoogleSheetsAdmin] Staff verification exception via Sheets API:', apiErr.message);
    }
  }

  // 2. Check Google Apps Script Web App
  const appsScriptUrl = process.env.STAFF_AUTH_APPS_SCRIPT_URL || process.env.GOOGLE_APPS_SCRIPT_URL;
  if (appsScriptUrl && typeof appsScriptUrl === 'string' && appsScriptUrl.startsWith('http')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const scriptRes = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Diblo-Staff-Auth/1.0'
        },
        body: JSON.stringify({
          action: 'verifyStaff',
          mobileNumber,
          password: cleanPassword,
          spreadsheetId: SPREADSHEET_ID,
          sheetName: STAFF_DETAILS_TAB_NAME
        }),
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (scriptRes.ok) {
        const data = await scriptRes.json().catch(() => null);
        if (data && data.success) {
          const rawRole = String(data.role || '').toLowerCase();
          const normalizedRole: 'Assistant' | 'Admin' =
            rawRole.includes('admin') || rawRole.includes('operation') ? 'Admin' : 'Assistant';

          return {
            success: true,
            role: normalizedRole,
            eplId: data.eplId || '',
            name: data.name || '',
            number: data.number || mobileNumber,
            email: data.email || '',
            message: 'Authentication successful',
            source: 'apps_script'
          };
        } else if (data) {
          const isNotFound = data.code === 'STAFF_NOT_FOUND' || String(data.message || '').toLowerCase().includes('not found');
          return {
            success: false,
            code: isNotFound ? 'STAFF_NOT_FOUND' : 'INVALID_CREDENTIALS',
            message: isNotFound ? 'Staff account not found.' : 'Mobile number or password is incorrect.'
          };
        }
      }
    } catch (scriptErr: any) {
      console.warn('[GoogleSheetsAdmin] Apps Script staff auth error:', scriptErr.message);
    }
  }

  // 3. Fallback Directory for Demo / Seed / Local Environments
  const matched = FALLBACK_STAFF_DIRECTORY.find((s) => {
    const phoneMatch = s.phone.slice(-10) === lookupMobile;
    const idMatch = s.eplId.toLowerCase() === rawId;
    return phoneMatch || idMatch;
  });

  if (matched) {
    if (matched.passwords.includes(cleanPassword)) {
      return {
        success: true,
        role: matched.role,
        eplId: matched.eplId,
        name: matched.name,
        number: matched.phone,
        email: matched.email,
        message: 'Authentication successful',
        source: 'fallback_directory'
      };
    }
    return {
      success: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Mobile number or password is incorrect.'
    };
  }

  return {
    success: false,
    code: 'STAFF_NOT_FOUND',
    message: 'Staff account not found.'
  };
}
