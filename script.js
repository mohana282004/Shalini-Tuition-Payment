/* Shalini Tuition Center - frontend logic */

// Paste your Google Apps Script Web app URL here (it ends with /exec)
const API_URL = 'PASTE_YOUR_WEB_APP_URL_HERE';

const CLASSES = ['LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

let token = sessionStorage.getItem('stc_token') || '';
let students = [];
let editingRow = null;

const $ = (id) => document.getElementById(id);

/* ---------- API ---------- */

async function api(action, data) {
  // text/plain avoids a CORS preflight, which Apps Script cannot answer
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(Object.assign({ action: action, token: token }, data || {}))
  });
  const out = await res.json();
  if (!out.ok) {
    if (out.error === 'unauthorized') {
      showLogin();
      throw new Error('Session expired. Please log in again.');
    }
    throw new Error(out.error || 'Something went wrong.');
  }
  return out;
}

/* ---------- Login / logout ---------- */

function showLogin() {
  token = '';
  sessionStorage.removeItem('stc_token');
  students = [];
  $('appView').hidden = true;
  $('loginView').hidden = false;
  $('password').value = '';
}

async function showApp() {
  $('loginView').hidden = true;
  $('appView').hidden = false;
  await loadStudents();
}

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('loginError').textContent = '';
  if (API_URL.indexOf('PASTE_') === 0) {
    $('loginError').textContent = 'Set API_URL in script.js first.';
    return;
  }
  $('loginBtn').disabled = true;
  $('loginBtn').textContent = 'Logging in...';
  try {
    const out = await api('login', { password: $('password').value });
    token = out.token;
    sessionStorage.setItem('stc_token', token);
    await showApp();
  } catch (err) {
    $('loginError').textContent = err.message;
  } finally {
    $('loginBtn').disabled = false;
    $('loginBtn').textContent = 'Log in';
  }
});

$('logoutBtn').addEventListener('click', async () => {
  try { await api('logout'); } catch (e) { /* ignore */ }
  showLogin();
});

/* ---------- Load & render ---------- */

function setMessage(text) { $('message').textContent = text; }

async function loadStudents() {
  setMessage('Loading students...');
  try {
    students = (await api('list')).students;
    setMessage('');
    render();
  } catch (err) {
    setMessage(err.message);
  }
}

function render() {
  const q = $('search').value.trim().toLowerCase();
  const cls = $('classFilter').value;
  const status = $('statusFilter').value;

  const paid = students.filter((s) => s.status === 'PAID').length;
  $('totalCount').textContent = students.length;
  $('paidCount').textContent = paid;
  $('unpaidCount').textContent = students.length - paid;

  const shown = getFiltered(q, cls, status);
  const body = $('tableBody');
  body.textContent = '';

  shown.forEach((s) => {
    const tr = document.createElement('tr');

    const nameTd = document.createElement('td');
    nameTd.textContent = s.name;
    const clsTd = document.createElement('td');
    clsTd.textContent = s.cls;

    const statusTd = document.createElement('td');
    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'badge ' + (s.status === 'PAID' ? 'paid' : 'unpaid');
    badge.textContent = s.status;
    badge.title = 'Click to change payment status';
    badge.addEventListener('click', () => toggleStatus(s));
    statusTd.appendChild(badge);

    const actionTd = document.createElement('td');
    actionTd.className = 'actions';
    const editBtn = makeButton('Edit', 'btn outline small', () => openDialog(s));
    const delBtn = makeButton('Delete', 'btn danger small', () => removeStudent(s));
    actionTd.append(editBtn, delBtn);

    tr.append(nameTd, clsTd, statusTd, actionTd);
    body.appendChild(tr);
  });

  $('emptyMsg').hidden = shown.length > 0;
  $('emptyMsg').textContent = students.length ? 'No students match your search or filters.' : 'No students yet. Click "Add student" to begin.';
}

function getFiltered(q, cls, status) {
  return students
    .filter((s) => (!q || s.name.toLowerCase().indexOf(q) !== -1) && (!cls || s.cls === cls) && (!status || s.status === status))
    .sort((a, b) => CLASSES.indexOf(a.cls) - CLASSES.indexOf(b.cls) || a.name.localeCompare(b.name));
}

function makeButton(label, className, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

/* ---------- Actions ---------- */

async function toggleStatus(s) {
  const next = s.status === 'PAID' ? 'NOT PAID' : 'PAID';
  setMessage('Saving...');
  try {
    await api('update', { row: s.row, name: s.name, cls: s.cls, status: next });
    await loadStudents();
    setMessage(s.name + ' marked as ' + next + '.');
  } catch (err) {
    setMessage(err.message);
  }
}

async function removeStudent(s) {
  if (!confirm('Delete ' + s.name + ' (' + s.cls + ')? This cannot be undone.')) return;
  setMessage('Deleting...');
  try {
    await api('delete', { row: s.row });
    await loadStudents();
    setMessage(s.name + ' deleted.');
  } catch (err) {
    setMessage(err.message);
  }
}

/* ---------- Add / edit dialog ---------- */

function openDialog(student) {
  editingRow = student ? student.row : null;
  $('dialogTitle').textContent = student ? 'Edit student' : 'Add student';
  $('nameInput').value = student ? student.name : '';
  $('classInput').value = student ? student.cls : '';
  $('statusInput').value = student ? student.status : 'NOT PAID';
  $('formError').textContent = '';
  $('studentDialog').showModal();
  $('nameInput').focus();
}

$('addBtn').addEventListener('click', () => openDialog(null));
$('cancelBtn').addEventListener('click', () => $('studentDialog').close());

$('studentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('formError').textContent = '';
  $('saveBtn').disabled = true;
  const data = {
    name: $('nameInput').value,
    cls: $('classInput').value,
    status: $('statusInput').value
  };
  try {
    if (editingRow) {
      await api('update', Object.assign({ row: editingRow }, data));
    } else {
      await api('add', data);
    }
    $('studentDialog').close();
    await loadStudents();
    setMessage(editingRow ? 'Student updated.' : 'Student added.');
  } catch (err) {
    $('formError').textContent = err.message;
  } finally {
    $('saveBtn').disabled = false;
  }
});

/* ---------- Filters ---------- */

function fillClassOptions() {
  const filter = $('classFilter');
  filter.add(new Option('All classes', ''));
  const input = $('classInput');
  input.add(new Option('Select class', ''));
  CLASSES.forEach((c) => {
    filter.add(new Option(c, c));
    input.add(new Option(c, c));
  });
}

['search', 'classFilter', 'statusFilter'].forEach((id) => {
  $(id).addEventListener('input', render);
});

/* ---------- CSV export (opens in Excel) ---------- */

function csvCell(value) {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = "'" + text; // stop Excel treating text as a formula
  return '"' + text.replace(/"/g, '""') + '"';
}

$('exportBtn').addEventListener('click', () => {
  const rows = getFiltered($('search').value.trim().toLowerCase(), $('classFilter').value, $('statusFilter').value);
  if (!rows.length) { setMessage('Nothing to export.'); return; }
  const lines = [['Student Name', 'Student Class', 'Payment Status'].map(csvCell).join(',')];
  rows.forEach((s) => lines.push([s.name, s.cls, s.status].map(csvCell).join(',')));

  // BOM at the start makes Excel read the file correctly
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'shalini-tuition-students-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
});

/* ---------- Start ---------- */

fillClassOptions();
if (token) {
  showApp().catch(showLogin);
}
