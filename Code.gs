
const SHEET_NAME = "Students";
const SESSION_SECONDS = 21600;

const HEADERS = [
  "Student Name",
  "Student Class",
  "Payment Status",
  "Parent Name",
  "Phone Number",
  "Amount"
];

function doGet() {
  return json({ ok: true, message: "Shalini Tuition Center API is running." });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");
    const action = data.action;

    if (action === "register") {
      return json(registerStudent(data));
    }

    if (action === "login") {
      return json(login(data.password));
    }

    const session = validateToken(data.token);
    if (!session) {
      throw new Error("Session expired. Please login again.");
    }

    if (action === "list") return json(listStudents());
    if (action === "add") return json(addStudent(data));
    if (action === "update") return json(updateStudent(data));
    if (action === "delete") return json(deleteStudent(data));
    if (action === "logout") {
      CacheService.getScriptCache().remove(data.token);
      return json({ ok: true });
    }

    throw new Error("Invalid action.");
  } catch (err) {
    return json({ ok: false, error: err.message });
  }
}

function json(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  } else {
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const current = sheet.getRange(1, 1, 1, lastCol)
      .getValues()[0].map(String);

    HEADERS.forEach(header => {
      if (!current.includes(header)) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
        current.push(header);
      }
    });
  }

  return sheet;
}

function getColumns(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0].map(String);

  const map = {};
  headers.forEach((header, index) => map[header] = index + 1);
  return map;
}

function registerStudent(data) {
  const name = String(data.name || "").trim();
  const parent = String(data.parent || "").trim();
  const cls = String(data.cls || "").trim();
  const phone = String(data.phone || "").trim();
  const amount = Number(data.amount);

  if (!name || !parent || !cls) throw new Error("Please fill all required fields.");
  if (!/^[6-9]\d{9}$/.test(phone)) throw new Error("Invalid phone number.");
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
    throw new Error("Invalid amount.");
  }

  const sheet = getSheet();
  const columns = getColumns(sheet);
  const row = new Array(sheet.getLastColumn()).fill("");

  row[columns["Student Name"] - 1] = name;
  row[columns["Student Class"] - 1] = cls;
  row[columns["Payment Status"] - 1] = "NOT PAID";
  row[columns["Parent Name"] - 1] = parent;
  row[columns["Phone Number"] - 1] = phone;
  row[columns["Amount"] - 1] = amount;

  sheet.appendRow(row);
  return { ok: true, message: "Registration successful." };
}

function login(password) {
  const savedPassword = PropertiesService.getScriptProperties()
    .getProperty("ADMIN_PASSWORD");

  if (!savedPassword || String(password) !== savedPassword) {
    throw new Error("Incorrect admin password.");
  }

  const token = Utilities.getUuid();
  CacheService.getScriptCache().put(token, "admin", SESSION_SECONDS);

  return { ok: true, token: token };
}

function validateToken(token) {
  if (!token) return false;
  return CacheService.getScriptCache().get(token) === "admin";
}

function listStudents() {
  const sheet = getSheet();
  const columns = getColumns(sheet);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return { ok: true, students: [] };

  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn())
    .getValues();

  const students = values.map((row, index) => ({
    row: index + 2,
    name: row[columns["Student Name"] - 1],
    cls: row[columns["Student Class"] - 1],
    status: row[columns["Payment Status"] - 1] || "NOT PAID",
    parent: row[columns["Parent Name"] - 1],
    phone: String(row[columns["Phone Number"] - 1] || ""),
    amount: row[columns["Amount"] - 1]
  }));

  return { ok: true, students: students };
}

function validateAdminStudent(data) {
  if (!String(data.name || "").trim()) throw new Error("Student name is required.");
  if (!String(data.cls || "").trim()) throw new Error("Class is required.");

  const status = String(data.status || "NOT PAID");
  if (!["PAID", "NOT PAID"].includes(status)) {
    throw new Error("Invalid payment status.");
  }
}

function writeStudent(sheet, rowNumber, data) {
  validateAdminStudent(data);
  const columns = getColumns(sheet);

  sheet.getRange(rowNumber, columns["Student Name"]).setValue(data.name);
  sheet.getRange(rowNumber, columns["Student Class"]).setValue(data.cls);
  sheet.getRange(rowNumber, columns["Payment Status"]).setValue(data.status);
  sheet.getRange(rowNumber, columns["Parent Name"]).setValue(data.parent || "");
  sheet.getRange(rowNumber, columns["Phone Number"]).setNumberFormat("@");
  sheet.getRange(rowNumber, columns["Phone Number"]).setValue(String(data.phone || ""));
  sheet.getRange(rowNumber, columns["Amount"]).setValue(Number(data.amount) || 0);
}

function addStudent(data) {
  const sheet = getSheet();
  writeStudent(sheet, sheet.getLastRow() + 1, data);
  return { ok: true };
}

function updateStudent(data) {
  const sheet = getSheet();
  const row = Number(data.row);

  if (!Number.isInteger(row) || row < 2 || row > sheet.getLastRow()) {
    throw new Error("Invalid student row.");
  }

  writeStudent(sheet, row, data);
  return { ok: true };
}

function deleteStudent(data) {
  const sheet = getSheet();
  const row = Number(data.row);

  if (!Number.isInteger(row) || row < 2 || row > sheet.getLastRow()) {
    throw new Error("Invalid student row.");
  }

  sheet.deleteRow(row);
  return { ok: true };
}
