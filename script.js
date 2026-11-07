
const API_URL = "https://script.google.com/macros/s/AKfycbxukpl7y6VzbHLVz_U7OxzgscTW0S8b-7bQJBv7u5UcT8M4m9TfJVkWz_ByzjGCNPhggg/exec";

const UPI_ID = "mugil26052016@okicici";
const PAYEE_NAME = "Shalini Tuition Center";

let token = sessionStorage.getItem("adminToken") || "";
let students = [];
let editingRow = null;
let registeredAmount = 0;

const $ = id => document.getElementById(id);

async function api(action, data = {}) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, token, ...data })
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.error || "Request failed");
  }

  return result;
}

function showStudent() {
  $("studentView").hidden = false;
  $("loginView").hidden = true;
  $("appView").hidden = true;
}

function showLogin() {
  $("studentView").hidden = true;
  $("loginView").hidden = false;
  $("appView").hidden = true;
}

function showApp() {
  $("studentView").hidden = true;
  $("loginView").hidden = true;
  $("appView").hidden = false;
  loadStudents();
}

$("adminOpenBtn").addEventListener("click", showLogin);
$("backToStudentBtn").addEventListener("click", showStudent);

$("registrationForm").addEventListener("submit", async event => {
  event.preventDefault();

  const button = $("registerBtn");
  const message = $("registrationMessage");

  const data = {
    name: $("studentName").value.trim(),
    parent: $("parentName").value.trim(),
    cls: $("studentClass").value,
    phone: $("studentPhone").value.trim(),
    amount: Number($("studentAmount").value)
  };

  if (!/^[6-9][0-9]{9}$/.test(data.phone)) {
    message.textContent = "Enter a valid 10-digit phone number.";
    return;
  }

  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    message.textContent = "Enter a valid amount.";
    return;
  }

  button.disabled = true;
  button.textContent = "Submitting...";
  message.textContent = "";

  $("upiPaymentSection").hidden = true;

  try {
    await api("register", data);

    registeredAmount = data.amount;
    $("paymentAmountText").textContent =
      "Amount entered during registration: ₹" + registeredAmount;

    $("upiPaymentSection").hidden = false;
    message.textContent = "Registration successful! You can now proceed to payment.";
    $("registrationForm").reset();
  } catch (error) {
    message.textContent = "Registration failed: " + error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Submit Registration";
  }
});

$("payNowBtn").addEventListener("click", () => {
  const link = "upi://pay?pa=" + encodeURIComponent(UPI_ID) +
    "&pn=" + encodeURIComponent(PAYEE_NAME) +
    "&cu=INR" +
    "&am=" + encodeURIComponent(registeredAmount.toFixed(2));

  window.location.href = link;
});

$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();

  const button = $("loginBtn");
  button.disabled = true;
  $("loginError").textContent = "";

  try {
    const result = await api("login", {
      password: $("password").value
    });

    token = result.token;
    sessionStorage.setItem("adminToken", token);
    $("password").value = "";
    showApp();
  } catch (error) {
    $("loginError").textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

$("logoutBtn").addEventListener("click", async () => {
  try {
    await api("logout");
  } catch (error) {
    // Clear the local session even if the server session has expired.
  }

  token = "";
  sessionStorage.removeItem("adminToken");
  showStudent();
});

async function loadStudents() {
  try {
    const result = await api("list");
    students = result.students || [];
    fillClassFilter();
    renderStudents();
  } catch (error) {
    $("message").textContent = error.message;
    token = "";
    sessionStorage.removeItem("adminToken");
    showLogin();
  }
}

function fillClassFilter() {
  const select = $("classFilter");
  const previous = select.value;
  const classes = [...new Set(students.map(s => s.cls).filter(Boolean))];

  select.innerHTML = '<option value="">All Classes</option>';

  classes.sort().forEach(cls => {
    const option = document.createElement("option");
    option.value = cls;
    option.textContent = cls;
    select.appendChild(option);
  });

  select.value = previous;
}

function renderStudents() {
  const search = $("search").value.toLowerCase();
  const cls = $("classFilter").value;
  const status = $("statusFilter").value;

  const filtered = students.filter(s =>
    String(s.name || "").toLowerCase().includes(search) &&
    (!cls || s.cls === cls) &&
    (!status || s.status === status)
  );

  $("totalCount").textContent = students.length;
  $("paidCount").textContent =
    students.filter(s => s.status === "PAID").length;
  $("unpaidCount").textContent =
    students.filter(s => s.status !== "PAID").length;

  const body = $("tableBody");
  body.innerHTML = "";

  filtered.forEach(student => {
    const tr = document.createElement("tr");

    [
      student.name,
      student.cls,
      student.parent,
      student.phone,
      "₹" + student.amount,
      student.status
    ].forEach(value => {
      const td = document.createElement("td");
      td.textContent = value ?? "";
      tr.appendChild(td);
    });

    const actions = document.createElement("td");

    const toggle = document.createElement("button");
    toggle.className = "btn outline";
    toggle.textContent =
      student.status === "PAID" ? "Mark Not Paid" : "Mark Paid";
    toggle.addEventListener("click", () => toggleStatus(student));

    const edit = document.createElement("button");
    edit.className = "btn outline";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => openEdit(student));

    const del = document.createElement("button");
    del.className = "btn outline";
    del.textContent = "Delete";
    del.addEventListener("click", () => deleteStudent(student));

    actions.append(toggle, edit, del);
    tr.appendChild(actions);
    body.appendChild(tr);
  });

  $("emptyMsg").hidden = filtered.length !== 0;
}

$("search").addEventListener("input", renderStudents);
$("classFilter").addEventListener("change", renderStudents);
$("statusFilter").addEventListener("change", renderStudents);

async function toggleStatus(student) {
  const newStatus = student.status === "PAID" ? "NOT PAID" : "PAID";

  if (newStatus === "PAID" &&
      !confirm("Have you verified that the payment was received?")) {
    return;
  }

  try {
    await api("update", {
      row: student.row,
      name: student.name,
      parent: student.parent,
      cls: student.cls,
      phone: student.phone,
      amount: student.amount,
      status: newStatus
    });

    await loadStudents();
  } catch (error) {
    $("message").textContent = error.message;
  }
}

function openEdit(student = null) {
  editingRow = student ? student.row : null;

  $("dialogTitle").textContent = student ? "Edit Student" : "Add Student";
  $("nameInput").value = student?.name || "";
  $("parentInput").value = student?.parent || "";
  $("classInput").value = student?.cls || "";
  $("phoneInput").value = student?.phone || "";
  $("amountInput").value = student?.amount || "";
  $("statusInput").value = student?.status || "NOT PAID";
  $("formError").textContent = "";

  $("studentDialog").showModal();
}

$("addBtn").addEventListener("click", () => openEdit());
$("cancelBtn").addEventListener("click", () => $("studentDialog").close());

function openEdit(student) {
  editingRow = student ? student.row : null;

  $("dialogTitle").textContent = student ? "Edit Student" : "Add Student";
  $("nameInput").value = student?.name || "";
  $("parentInput").value = student?.parent || "";
  $("classInput").value = student?.cls || "";
  $("phoneInput").value = student?.phone || "";
  $("amountInput").value = student?.amount || "";
  $("statusInput").value = student?.status || "NOT PAID";
  $("formError").textContent = "";

  $("studentDialog").showModal();
}

$("studentForm").addEventListener("submit", async event => {
  event.preventDefault();

  const data = {
    name: $("nameInput").value.trim(),
    parent: $("parentInput").value.trim(),
    cls: $("classInput").value.trim(),
    phone: $("phoneInput").value.trim(),
    amount: Number($("amountInput").value),
    status: $("statusInput").value
  };

  try {
    if (editingRow) {
      await api("update", { row: editingRow, ...data });
    } else {
      await api("add", data);
    }

    $("studentDialog").close();
    await loadStudents();
  } catch (error) {
    $("formError").textContent = error.message;
  }
});

async function deleteStudent(student) {
  if (!confirm("Delete " + student.name + "?")) return;

  try {
    await api("delete", { row: student.row });
    await loadStudents();
  } catch (error) {
    $("message").textContent = error.message;
  }
}

$("exportBtn").addEventListener("click", () => {
  const headings = [
    "Student Name", "Class", "Parent Name",
    "Phone", "Amount", "Payment Status"
  ];

  const rows = students.map(s => [
    s.name, s.cls, s.parent, s.phone, s.amount, s.status
  ]);

  const csv = [headings, ...rows]
    .map(row => row.map(value =>
      '"' + String(value ?? "").replace(/"/g, '""') + '"'
    ).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Shalini_Students.csv";
  a.click();
  URL.revokeObjectURL(url);
});

if (token) {
  showApp();
} else {
  showStudent();
}
