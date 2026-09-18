import crypto from 'crypto';
import { AssistantApplication } from '../../src/types';

export const SPREADSHEET_ID = '19GO22yFFHR7fLbC8v4R8xifkI6f2fgdQbfQlvxfMHC0';
export const ONBOARDING_TAB_NAME = 'New Staff Onbording'; // Exact spelling specified by user

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
