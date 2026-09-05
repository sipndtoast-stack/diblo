/**
 * DIBLO STAFF AUTHENTICATION — GOOGLE APPS SCRIPT WEB APP
 *
 * Spreadsheet ID: 19GO22yFFHR7fLbC8v4R8xifkI6f2fgdQbfQlvxfMHC0
 * Sheet Tab: Staff Details
 *
 * Column Mapping:
 * Column A (0) = EPL ID
 * Column B (1) = Name
 * Column C (2) = Number (Mobile Number)
 * Column D (3) = Email
 * Column E (4) = Password
 * Column F (5) = Role (Assistant / Admin)
 *
 * Verification Rule:
 * Mobile Number entered matches Column C (Number)
 * Password entered matches Column E (Password)
 */

var SPREADSHEET_ID = '19GO22yFFHR7fLbC8v4R8xifkI6f2fgdQbfQlvxfMHC0';
var SHEET_NAME = 'Staff Details';

/**
 * Handles POST requests from Diblo backend verification layer
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        success: false,
        message: 'Invalid mobile number or password.'
      });
    }

    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({
        success: false,
        message: 'Invalid mobile number or password.'
      });
    }

    var mobileNumber = payload.mobileNumber || payload.number || payload.phone || payload.eplId || '';
    var password = payload.password ? String(payload.password).trim() : '';

    var cleanInputPhone = normalizePhone(mobileNumber);

    if (!cleanInputPhone || !password) {
      return createJsonResponse({
        success: false,
        message: 'Invalid mobile number or password.'
      });
    }

    // Open Spreadsheet
    var spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (err) {
      try {
        spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      } catch (activeErr) {
        return createJsonResponse({
          success: false,
          message: 'Staff login service is temporarily unavailable. Please try again.'
        });
      }
    }

    if (!spreadsheet) {
      return createJsonResponse({
        success: false,
        message: 'Staff login service is temporarily unavailable. Please try again.'
      });
    }

    // Open "Staff Details" Sheet Tab
    var sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) {
      return createJsonResponse({
        success: false,
        message: 'Staff login service is temporarily unavailable. Please try again.'
      });
    }

    // Read all rows
    var data = sheet.getDataRange().getValues();
    if (!data || data.length < 2) {
      return createJsonResponse({
        success: false,
        message: 'Invalid mobile number or password.'
      });
    }

    // Identify header indices (Case-insensitive)
    var headerRow = data[0];
    var colEplId = -1;
    var colName = -1;
    var colNumber = -1;
    var colEmail = -1;
    var colPassword = -1;
    var colRole = -1;

    for (var c = 0; c < headerRow.length; c++) {
      var headerText = String(headerRow[c] || '').trim().toLowerCase();
      if (headerText === 'epl id' || headerText === 'eplid' || headerText === 'id') colEplId = c;
      else if (headerText === 'name' || headerText === 'employee name') colName = c;
      else if (headerText === 'number' || headerText === 'mobile' || headerText === 'phone' || headerText === 'mobile number') colNumber = c;
      else if (headerText === 'email') colEmail = c;
      else if (headerText === 'password') colPassword = c;
      else if (headerText === 'role') colRole = c;
    }

    // Standard columns: A=0, B=1, C=2, D=3, E=4, F=5
    if (colEplId === -1) colEplId = 0;
    if (colName === -1) colName = 1;
    if (colNumber === -1) colNumber = 2;
    if (colEmail === -1) colEmail = 3;
    if (colPassword === -1) colPassword = 4;
    if (colRole === -1) colRole = 5;

    // Search for matching employee
    var matchedRow = null;

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowPhone = normalizePhone(row[colNumber]);
      var rowEplId = String(row[colEplId] || '').trim().toLowerCase();

      // Check if phone matches (or fallback eplId match for flexibility)
      var phoneMatches = rowPhone && (rowPhone === cleanInputPhone || rowPhone.slice(-10) === cleanInputPhone.slice(-10));
      var idMatches = rowEplId && rowEplId === String(mobileNumber).trim().toLowerCase();

      if (phoneMatches || idMatches) {
        var rowPassword = String(row[colPassword] || '').trim();
        if (rowPassword === password) {
          matchedRow = row;
          break;
        }
      }
    }

    if (!matchedRow) {
      return createJsonResponse({
        success: false,
        message: 'Invalid mobile number or password.'
      });
    }

    // Normalize Role: case-insensitive match
    var rawRole = String(matchedRow[colRole] || '').trim().toLowerCase();
    var normalizedRole = 'Assistant';
    if (rawRole === 'admin' || rawRole === 'administrator' || rawRole === 'operations') {
      normalizedRole = 'Admin';
    }

    // Return strictly the sanitized employee data. DO NOT return passwords or full sheet!
    return createJsonResponse({
      success: true,
      eplId: String(matchedRow[colEplId] || '').trim(),
      name: String(matchedRow[colName] || 'Diblo Staff').trim(),
      number: String(matchedRow[colNumber] || '').trim(),
      email: String(matchedRow[colEmail] || '').trim(),
      role: normalizedRole
    });

  } catch (globalErr) {
    return createJsonResponse({
      success: false,
      message: 'Staff login service is temporarily unavailable. Please try again.'
    });
  }
}

/**
 * Handles GET requests for health check or testing
 */
function doGet() {
  return createJsonResponse({
    status: 'ok',
    service: 'Diblo Staff Authentication Service',
    message: 'Send POST with { mobileNumber, password } to authenticate staff.'
  });
}

/**
 * Helper to normalize phone numbers (extracts last 10 digits)
 */
function normalizePhone(val) {
  if (!val) return '';
  var digits = String(val).replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Creates a JSON ContentService response with proper MIME type
 */
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
