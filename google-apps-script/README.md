# Diblo Staff Authentication — Google Apps Script Web App

This directory contains the production-ready Google Apps Script backend for staff authentication against the **Staff Details** tab of the Diblo Google Spreadsheet.

## Spreadsheet Details
- **Spreadsheet ID:** `19GO22yFFHR7fLbC8v4R8xifkI6f2fgdQbfQlvxfMHC0`
- **Sheet Tab Name:** `Staff Details`
- **Column Order:**
  - Column A: `EPL ID`
  - Column B: `Name`
  - Column C: `Number`
  - Column D: `Email`
  - Column E: `Password`
  - Column F: `Role`

## How to Deploy the Web App
1. Go to [Google Apps Script](https://script.google.com) while signed into the Google account that has access to the spreadsheet.
2. Click **New Project** and name it `Diblo Staff Auth Service`.
3. Open `Code.gs` in the editor and replace its entire contents with the code inside [`google-apps-script/Code.gs`](./Code.gs).
4. Click **Deploy** (top right) > **New deployment**.
5. Click the gear icon next to "Select type" and choose **Web app**.
6. Fill in configuration:
   - **Description:** `Diblo Staff Auth Web App`
   - **Execute as:** `Me (your-email@...)`
   - **Who has access:** `Anyone` (essential so Diblo backend server can verify credentials)
7. Click **Deploy**.
8. Grant required permissions when prompted (Spreadsheet read access).
9. Copy the generated **Web App URL** (e.g. `https://script.google.com/macros/s/AKfycb.../exec`).
10. Add this URL to your environment variables (`.env`):
    ```env
    STAFF_AUTH_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycb.../exec
    ```

## Security Guarantees
- Frontend JavaScript NEVER accesses Google Sheets directly.
- Passwords are NEVER exposed to the browser, stored in client storage, or logged.
- Only the minimal payload (`{ success: true, role, eplId, name }`) is returned upon successful credential verification.
- Roles are matched case-insensitively (`Assistant`, `assistant`, `ASSISTANT` -> `Assistant`; `Admin`, `admin`, `ADMIN` -> `Admin`).
