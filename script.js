
/* SHALINI TUITION CENTER */

const API_URL = 'https://script.google.com/macros/s/AKfycbxukpl7y6VzbHLVz_U7OxzgscTW0S8b-7bQJBv7u5UcT8M4m9TfJVkWz_ByzjGCNPhggg/exec';

const CLASSES = [
  'LKG', 'UKG', '1st', '2nd', '3rd', '4th',
  '5th', '6th', '7th', '8th', '9th',
  '10th', '11th', '12th'
];

let token = sessionStorage.getItem('stc_token') || '';
let students = [];
let editingRow = null;

const $ = id => document.getElementById(id);

/* ---------- API ---------- */

async function api(action, data = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify({
      action,
      token,
      ...data
    })
  });

  const result = await response.json();

  if (!result.ok) {
    if (result.error === 'unauthorized') {
      showLogin();
    }
    throw new Error(result.error || 'Something went wrong.');
  }

  return result;
}

/* ---------- PAGE NAVIGATION ---------- */

function showStudent() {
  $('studentView').hidden = false;
  $('loginView').hidden = true;
  $('appView').hidden = true;
}

function showLogin() {
  token = '';
  sessionStorage.removeItem('stc_token');
  students = [];

  $('studentView').hidden = true;
  $('appView').hidden = true;
  $('loginView').hidden = false;
  $('password').value = '';
}

async function showApp() {
  $('studentView').hidden = true;
  $('loginView').hidden = true;
  $('appView').hidden = false;
  await loadStudents();
}

$('adminOpenBtn').addEventListener('click', showLogin);

$('backToStudentBtn').addEventListener('click', showStudent);

/* ---------- STUDENT REGISTRATION ---------- */

$('registrationForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const button = $('registerBtn');
  const message = $('registrationMessage');

  message.textContent = '';
  button.disabled = true;
  button.textContent = 'Submitting...';

  const data = {
    name: $('studentName').value.trim(),
    parent: $('parentName').value.trim(),
    cls: $('studentClass').value,
    phone: $('studentPhone').value.trim(),
    amount: Number($('studentAmount').value)
  };

  try {
    await api('register', data);

    message.textContent =
      'Registration successful! Thank you.';

    message.style.color = 'green';

    $('registrationForm').reset();

  } catch (error) {
    message.textContent = error.message;
    message.style.color = 'red';

  } finally {
    button.disabled = false;
    button.textContent = 'Submit Registration';
  }
});

/* ---------- ADMIN LOGIN ---------- */

$('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  $('loginError').textContent = '';
  $('loginBtn').disabled = true;
  $('loginBtn').textContent = 'Logging in...';

  try {
    const result = await api('login', {
      password: $('password').value
    });

    token = result.token;
    sessionStorage.setItem('stc_token', token);

    await showApp();

  } catch (error) {
    $('loginError').textContent = error.message;

  } finally {
    $('loginBtn').disabled = false;
    $('loginBtn').textContent = 'Log in';
  }
});

/* ---------- ADMIN LOGOUT ---------- */

$('logoutBtn').addEventListener('click', async function() {
  try {
    await api('logout');
  } catch (error) {
    // Continue to logout even if session has expired
  }

  showStudent();
});

/* ---------- LOAD STUDENTS ---------- */

function setMessage(message) {
  $('message').textContent = message;
}

async function loadStudents() {
  setMessage('Loading students...');

  try {
    const result = await api('list');
    students = result.students || [];

    setMessage('');
    render();

  } catch (error) {
    setMessage(error.message);
  }
}

/* ---------- DASHBOARD RENDER ---------- */

function render() {
  const query = $('search').value.trim().toLowerCase();
  const cls = $('classFilter').value;
  const status = $('statusFilter').value;

  const paid = students.filter(s => s.status === 'PAID').length;

  $('totalCount').textContent = students.length;
  $('paidCount').textContent = paid;
  $('unpaidCount').textContent = students.length - paid;

  const shown = getFiltered(query, cls, status);
  const body = $('tableBody');

  body.textContent = '';

  shown.forEach(student => {
    const tr = document.createElement('tr');

    function addCell(value) {
      const td = document.createElement('td');
      td.textContent = value || '-';
      tr.appendChild(td);
      return td;
    }

    addCell(student.name);
    addCell(student.cls);
    addCell(student.parent);
    addCell(student.phone);
    addCell(student.amount ? '₹' + student.amount : '-');

    const statusTd = document.createElement('td');
    const badge = document.createElement('button');

    badge.type = 'button';
    badge.className =
      'badge ' + (student.status === 'PAID' ? 'paid' : 'unpaid');
    badge.textContent = student.status;
    badge.title = 'Click to change payment status';

    badge.addEventListener('click', () => toggleStatus(student));

    statusTd.appendChild(badge);
    tr.appendChild(statusTd);

    const actionTd = document.createElement('td');
    actionTd.className = 'actions';

    actionTd.append(
      makeButton('Edit', 'btn outline small',
        () => openDialog(student)),
      makeButton('Delete', 'btn danger small',
        () => removeStudent(student))
    );

    tr.appendChild(actionTd);
    body.appendChild(tr);
  });

  $('emptyMsg').hidden = shown.length > 0;

  if (shown.length === 0) {
    $('emptyMsg').textContent = students.length
      ? 'No students match your search or filters.'
      : 'No students registered yet.';
  }
}

function getFiltered(query, cls, status) {
  return students
    .filter(s =>
      (!query || s.name.toLowerCase().includes(query)) &&
      (!cls || s.cls === cls) &&
      (!status || s.status === status)
    )
    .sort((a, b) =>
      CLASSES.indexOf(a.cls) - CLASSES.indexOf(b.cls) ||
      a.name.localeCompare(b.name)
    );
}

function makeButton(label, className, callback) {
  const button = document.createElement('button');

  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', callback);

  return button;
}

/* ---------- PAYMENT STATUS ---------- */

async function toggleStatus(student) {
  const next = student.status === 'PAID'
    ? 'NOT PAID'
    : 'PAID';

  setMessage('Updating payment status...');

  try {
    await api('update', {
      row: student.row,
      name: student.name,
      cls: student.cls,
      parent: student.parent,
      phone: student.phone,
      amount: student.amount,
      status: next
    });

    await loadStudents();
    setMessage(student.name + ' marked as ' + next + '.');

  } catch (error) {
    setMessage(error.message);
  }
}

/* ---------- DELETE STUDENT ---------- */

async function removeStudent(student) {
  if (!confirm('Delete ' + student.name + '?')) return;

  try {
    await api('delete', {
      row: student.row
    });

    await loadStudents();
    setMessage('Student deleted successfully.');

  } catch (error) {
    setMessage(error.message);
  }
}

/* ---------- ADD / EDIT STUDENT ---------- */

function openDialog(student) {
  editingRow = student ? student.row : null;

  $('dialogTitle').textContent =
    student ? 'Edit student' : 'Add student';

  $('nameInput').value = student ? student.name : '';
  $('parentInput').value = student ? student.parent : '';
  $('classInput').value = student ? student.cls : '';
  $('phoneInput').value = student ? student.phone : '';
  $('amountInput').value = student ? student.amount : '';
  $('statusInput').value = student ? student.status : 'NOT PAID';

  $('formError').textContent = '';

  $('studentDialog').showModal();
}

$('addBtn').addEventListener('click', () => openDialog(null));

$('cancelBtn').addEventListener('click', () => {
  $('studentDialog').close();
});

$('studentForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  $('saveBtn').disabled = true;
  $('formError').textContent = '';

  const data = {
    name: $('nameInput').value.trim(),
    parent: $('parentInput').value.trim(),
    cls: $('classInput').value,
    phone: $('phoneInput').value.trim(),
    amount: Number($('amountInput').value),
    status: $('statusInput').value
  };

  try {
    if (editingRow !== null) {
      await api('update', {
        row: editingRow,
        ...data
      });
    } else {
      await api('add', data);
    }

    $('studentDialog').close();
    await loadStudents();

  } catch (error) {
    $('formError').textContent = error.message;

  } finally {
    $('saveBtn').disabled = false;
  }
});

/* ---------- FILTERS ---------- */

function fillClassOptions() {
  const filter = $('classFilter');
  const input = $('classInput');

  filter.add(new Option('All classes', ''));
  input.add(new Option('Select class', ''));

  CLASSES.forEach(cls => {
    filter.add(new Option(cls, cls));
    input.add(new Option(cls, cls));
  });
}

['search', 'classFilter', 'statusFilter'].forEach(id => {
  $(id).addEventListener('input', render);
});

/* ---------- CSV EXPORT ---------- */

function csvCell(value) {
  let text = String(value ?? '');

  if (/^[=+\-@]/.test(text)) {
    text = "'" + text;
  }

  return '"' + text.replace(/"/g, '""') + '"';
}

$('exportBtn').addEventListener('click', function() {
  const rows = getFiltered(
    $('search').value.trim().toLowerCase(),
    $('classFilter').value,
    $('statusFilter').value
  );

  if (!rows.length) {
    setMessage('Nothing to export.');
    return;
  }

  const headers = [
    'Student Name',
    'Student Class',
    'Parent Name',
    'Phone Number',
    'Amount',
    'Payment Status'
  ];

  const lines = [
    headers.map(csvCell).join(',')
  ];

  rows.forEach(s => {
    lines.push([
      s.name,
      s.cls,
      s.parent,
      s.phone,
      s.amount,
      s.status
    ].map(csvCell).join(','));
  });

  const blob = new Blob(
    ['\uFEFF' + lines.join('\r\n')],
    { type: 'text/csv;charset=utf-8;' }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'shalini-tuition-students.csv';

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
});

/* ---------- START ---------- */

fillClassOptions();

if (token) {
  showApp().catch(showLogin);
} else {
  showStudent();
}
