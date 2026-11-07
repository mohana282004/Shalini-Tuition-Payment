
/**
 * SHALINI TUITION CENTER
 * Public Student Registration + Protected Admin Dashboard
 */

const SHEET_NAME = 'Students';

const HEADERS = [
  'Student Name',
  'Student Class',
  'Payment Status',
  'Parent Name',
  'Phone Number',
  'Amount'
];

const CLASSES = [
  'LKG', 'UKG', '1st', '2nd', '3rd', '4th',
  '5th', '6th', '7th', '8th', '9th',
  '10th', '11th', '12th'
];

const STATUSES = ['PAID', 'NOT PAID'];
const SESSION_SECONDS = 21600;

function doGet() {
  return output({
    ok: true,
    message: 'Shalini Tuition Center API is running.'
  });
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents || '{}');

    // Public student registration
    if (req.action === 'register') {
      return output(registerStudent(req));
    }

    // Admin login
    if (req.action === 'login') {
      return output(login(req.password));
    }

    // All other actions require admin login
    if (!isValidToken(req.token)) {
      return output({
        ok: false,
        error: 'unauthorized'
      });
    }

    if (req.action === 'logout') {
      CacheService.getScriptCache()
        .remove('session_' + req.token);

      return output({ ok: true });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(15000);

    try {
      switch (req.action) {
        case 'list':
          return output({
            ok: true,
            students: listStudents()
          });

        case 'add':
          addStudent(req);
          return output({ ok: true });

        case 'update':
          updateStudent(req);
          return output({ ok: true });

        case 'delete':
          deleteStudent(req.row);
          return output({ ok: true });

        default:
          return output({
            ok: false,
            error: 'Unknown action.'
          });
      }
    } finally {
      lock.releaseLock();
    }

  } catch (err) {
    return output({
      ok: false,
      error: err.message
    });
  }
}

/* ---------- SHEET ---------- */

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setValues([HEADERS])
      .setFontWeight('bold');

    sheet.setFrozenRows(1);
  } else {
    // Preserve existing records and add new columns
    const existing = sheet.getRange(
      1, 1, 1, Math.max(sheet.getLastColumn(), 1)
    ).getDisplayValues()[0];

    HEADERS.forEach(function(header) {
      if (existing.indexOf(header) === -1) {
        const col = sheet.getLastColumn() + 1;
        sheet.getRange(1, col).setValue(header);
        existing.push(header);
      }
    });
  }

  return sheet;
}

function getColumnMap(sheet) {
  const headers = sheet.getRange(
    1, 1, 1, sheet.getLastColumn()
  ).getDisplayValues()[0];

  const map = {};
  headers.forEach(function(h, i) {
    map[h] = i + 1;
  });

  return map;
}

/* ---------- PUBLIC REGISTRATION ---------- */

function registerStudent(req) {
  const name = String(req.name || '').trim();
  const parent = String(req.parent || '').trim();
  const cls = String(req.cls || '').trim();
  const phone = String(req.phone || '').trim();
  const amount = Number(req.amount);

  if (!name || name.length > 60) {
    throw new Error('Enter a valid student name.');
  }

  if (!parent || parent.length > 60) {
    throw new Error('Enter a valid parent name.');
  }

  if (CLASSES.indexOf(cls) === -1) {
    throw new Error('Select a valid class.');
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new Error('Enter a valid 10-digit phone number.');
  }

  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
    throw new Error('Enter a valid amount.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const sheet = getSheet();
    const map = getColumnMap(sheet);
    const row = sheet.getLastRow() + 1;

    sheet.getRange(row, map['Student Name']).setValue(name);
    sheet.getRange(row, map['Student Class']).setValue(cls);
    sheet.getRange(row, map['Payment Status']).setValue('NOT PAID');
    sheet.getRange(row, map['Parent Name']).setValue(parent);
    sheet.getRange(row, map['Phone Number']).setNumberFormat('@').setValue(phone);
    sheet.getRange(row, map['Amount']).setValue(amount);

    return {
      ok: true,
      message: 'Registration successful.'
    };

  } finally {
    lock.releaseLock();
  }
}

/* ---------- ADMIN LOGIN ---------- */

function login(password) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('failed_logins') || 0);

  if (fails >= 5) {
    throw new Error('Too many attempts. Try again after 15 minutes.');
  }

  const real = PropertiesService.getScriptProperties()
    .getProperty('ADMIN_PASSWORD');

  if (!real) {
    throw new Error('ADMIN_PASSWORD is not configured.');
  }

  if (typeof password !== 'string' || password !== real) {
    cache.put('failed_logins', String(fails + 1), 900);
    throw new Error('Incorrect password.');
  }

  cache.remove('failed_logins');

  const token = Utilities.getUuid() + Utilities.getUuid();

  cache.put('session_' + token, '1', SESSION_SECONDS);

  return {
    ok: true,
    token: token
  };
}

function isValidToken(token) {
  if (typeof token !== 'string' || token.length < 32) {
    return false;
  }

  return CacheService.getScriptCache()
    .get('session_' + token) === '1';
}

/* ---------- ADMIN STUDENT OPERATIONS ---------- */

function listStudents() {
  const sheet = getSheet();
  const map = getColumnMap(sheet);
  const last = sheet.getLastRow();

  if (last < 2) return [];

  const data = sheet.getRange(
    2, 1, last - 1, sheet.getLastColumn()
  ).getDisplayValues();

  return data.map(function(r, i) {
    return {
      row: i + 2,
      name: r[map['Student Name'] - 1],
      cls: r[map['Student Class'] - 1],
      status: r[map['Payment Status'] - 1],
      parent: r[map['Parent Name'] - 1] || '',
      phone: r[map['Phone Number'] - 1] || '',
      amount: r[map['Amount'] - 1] || ''
    };
  }).filter(function(s) {
    return s.name !== '';
  });
}

function addStudent(req) {
  const sheet = getSheet();
  const map = getColumnMap(sheet);

  validateAdminStudent(req);

  const row = sheet.getLastRow() + 1;
  writeStudent(sheet, map, row, req);
}

function updateStudent(req) {
  const sheet = getSheet();
  const map = getColumnMap(sheet);

  validateAdminStudent(req);

  const row = Number(req.row);

  if (!Number.isInteger(row) || row < 2 || row > sheet.getLastRow()) {
    throw new Error('Student record not found.');
  }

  writeStudent(sheet, map, row, req);
}

function validateAdminStudent(req) {
  if (!String(req.name || '').trim()) {
    throw new Error('Student name is required.');
  }

  if (CLASSES.indexOf(String(req.cls || '')) === -1) {
    throw new Error('Invalid class.');
  }

  if (STATUSES.indexOf(String(req.status || '')) === -1) {
    throw new Error('Invalid payment status.');
  }
}

function writeStudent(sheet, map, row, req) {
  sheet.getRange(row, map['Student Name'])
    .setValue(String(req.name).trim());

  sheet.getRange(row, map['Student Class'])
    .setValue(req.cls);

  sheet.getRange(row, map['Payment Status'])
    .setValue(req.status);

  if (map['Parent Name']) {
    sheet.getRange(row, map['Parent Name'])
      .setValue(req.parent || '');
  }

  if (map['Phone Number']) {
    sheet.getRange(row, map['Phone Number'])
      .setNumberFormat('@')
      .setValue(req.phone || '');
  }

  if (map['Amount'] && req.amount !== undefined) {
    sheet.getRange(row, map['Amount'])
      .setValue(req.amount);
  }
}

function deleteStudent(row) {
  const sheet = getSheet();
  row = Number(row);

  if (!Number.isInteger(row) || row < 2 || row > sheet.getLastRow()) {
    throw new Error('Student not found.');
  }

  sheet.deleteRow(row);
}

/* ---------- RESPONSE ---------- */

function output(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
