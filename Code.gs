/**
 * Shalini Tuition Center - backend (Google Apps Script)
 * Bound to a Google Sheet. Student data is only returned after a successful login.
 *
 * Setup: Project Settings (gear icon) > Script Properties > add
 *        ADMIN_PASSWORD = your secret password
 */

const SHEET_NAME = 'Students';
const HEADERS = ['Student Name', 'Student Class', 'Payment Status'];
const CLASSES = ['LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const STATUSES = ['PAID', 'NOT PAID'];
const SESSION_SECONDS = 6 * 60 * 60; // 6 hours (maximum CacheService allows)
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_SECONDS = 15 * 60;

function doGet() {
  return output({ ok: true, message: 'Shalini Tuition Center API is running.' });
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);

    if (req.action === 'login') return output(login(req.password));
    if (!isValidToken(req.token)) return output({ ok: false, error: 'unauthorized' });

    if (req.action === 'logout') {
      CacheService.getScriptCache().remove('session_' + req.token);
      return output({ ok: true });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      switch (req.action) {
        case 'list':   return output({ ok: true, students: listStudents() });
        case 'add':    addStudent(req); return output({ ok: true });
        case 'update': updateStudent(req); return output({ ok: true });
        case 'delete': deleteStudent(req.row); return output({ ok: true });
        default:       return output({ ok: false, error: 'Unknown action.' });
      }
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return output({ ok: false, error: err.message });
  }
}

/* ---------- Authentication ---------- */

function login(password) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('failed_logins') || 0);
  if (fails >= MAX_FAILED_LOGINS) {
    return { ok: false, error: 'Too many wrong attempts. Try again after 15 minutes.' };
  }

  const real = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!real) return { ok: false, error: 'ADMIN_PASSWORD is not set in Script Properties.' };

  if (typeof password !== 'string' || password !== real) {
    cache.put('failed_logins', String(fails + 1), LOCKOUT_SECONDS);
    return { ok: false, error: 'Incorrect password.' };
  }

  cache.remove('failed_logins');
  const token = Utilities.getUuid() + Utilities.getUuid();
  cache.put('session_' + token, '1', SESSION_SECONDS);
  return { ok: true, token: token };
}

function isValidToken(token) {
  if (typeof token !== 'string' || token.length < 32) return false;
  return CacheService.getScriptCache().get('session_' + token) === '1';
}

/* ---------- Sheet helpers ---------- */

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 3).setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  // Plain text format: stops "5th" or "=1+1" being converted to numbers/formulas
  sheet.getRange('A:C').setNumberFormat('@');
  return sheet;
}

function clean(req) {
  const name = String(req.name || '').trim().replace(/\s+/g, ' ');
  const cls = String(req.cls || '');
  const status = String(req.status || '');
  if (!name) throw new Error('Student name is required.');
  if (name.length > 60) throw new Error('Student name is too long (max 60 characters).');
  if (CLASSES.indexOf(cls) === -1) throw new Error('Invalid class.');
  if (STATUSES.indexOf(status) === -1) throw new Error('Invalid payment status.');
  return [name, cls, status];
}

function checkRow(sheet, row) {
  row = Number(row);
  if (!Number.isInteger(row) || row < 2 || row > sheet.getLastRow()) {
    throw new Error('Record not found. Please refresh the page.');
  }
  return row;
}

/* ---------- Student operations ---------- */

function listStudents() {
  const sheet = getSheet();
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, 3).getValues()
    .map(function (r, i) { return { row: i + 2, name: r[0], cls: r[1], status: r[2] }; })
    .filter(function (s) { return s.name !== ''; });
}

function addStudent(req) {
  const values = clean(req);
  const sheet = getSheet();
  const row = sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, 3).setValues([values]);
}

function updateStudent(req) {
  const values = clean(req);
  const sheet = getSheet();
  const row = checkRow(sheet, req.row);
  sheet.getRange(row, 1, 1, 3).setValues([values]);
}

function deleteStudent(row) {
  const sheet = getSheet();
  sheet.deleteRow(checkRow(sheet, row));
}

function output(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
