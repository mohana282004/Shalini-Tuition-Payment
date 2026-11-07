```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Shalini Tuition Center</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=Nunito+Sans:wght@400;600;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="style.css">
</head>
<body>

  <!-- Student Registration Page -->
  <main id="studentView" class="container">
    <header class="topbar">
      <h1 class="brand">Shalini Tuition Center</h1>
      <button class="btn outline" id="adminOpenBtn" type="button">
        Admin Login
      </button>
    </header>

    <section class="login-card">
      <h2>Student Registration</h2>
      <p class="muted">Please enter your details below.</p>

      <form id="registrationForm">
        <label for="studentName">Student Name</label>
        <input type="text" id="studentName" maxlength="60" required>

        <label for="parentName">Parent Name</label>
        <input type="text" id="parentName" maxlength="60" required>

        <label for="studentClass">Class</label>
        <select id="studentClass" required>
          <option value="">Select class</option>
          <option>LKG</option>
          <option>UKG</option>
          <option>1st</option>
          <option>2nd</option>
          <option>3rd</option>
          <option>4th</option>
          <option>5th</option>
          <option>6th</option>
          <option>7th</option>
          <option>8th</option>
          <option>9th</option>
          <option>10th</option>
          <option>11th</option>
          <option>12th</option>
        </select>

        <label for="studentPhone">Phone Number</label>
        <input
          type="tel"
          id="studentPhone"
          inputmode="numeric"
          maxlength="10"
          pattern="[6-9][0-9]{9}"
          required
        >

        <label for="studentAmount">Amount (₹)</label>
        <input
          type="number"
          id="studentAmount"
          min="1"
          max="1000000"
          step="1"
          required
        >

        <p id="registrationMessage" class="message" role="status"></p>

        <button type="submit" class="btn primary" id="registerBtn">
          Submit Registration
        </button>
      </form>

      <!-- UPI Payment Section -->
      <div id="upiPaymentSection" hidden>
        <hr>
        <h3>UPI Payment</h3>
        <p>UPI ID: <strong>mugil26052016@okicici</strong></p>
        <p class="muted">
          Registration successful! Click below to open your UPI payment app.
          Enter the amount in your UPI app.
        </p>

        <button type="button" class="btn primary" id="payNowBtn">
          Pay Now
        </button>

        <p class="muted">
          Payment status will be updated by the admin after verification.
        </p>
      </div>
    </section>
  </main>

  <!-- Admin Login -->
  <main id="loginView" class="login-wrap" hidden>
    <form id="loginForm" class="login-card">
      <h1 class="brand">Shalini Tuition Center</h1>
      <p class="muted">Admin login</p>

      <label for="password">Password</label>
      <input
        type="password"
        id="password"
        autocomplete="current-password"
        required
      >

      <p id="loginError" class="error" role="alert"></p>

      <button type="submit" class="btn primary" id="loginBtn">
        Log in
      </button>

      <button type="button" class="btn outline" id="backToStudentBtn">
        Back to Student Form
      </button>
    </form>
  </main>

  <!-- Admin Dashboard -->
  <div id="appView" hidden>
    <header class="topbar">
      <h1 class="brand">Shalini Tuition Center</h1>
      <button class="btn light" id="logoutBtn">Log out</button>
    </header>

    <main class="container">
      <section class="cards" aria-label="Summary">
        <div class="card">
          <span class="card-num" id="totalCount">0</span>
          <span>Total students</span>
        </div>

        <div class="card paid">
          <span class="card-num" id="paidCount">0</span>
          <span>Paid</span>
        </div>

        <div class="card unpaid">
          <span class="card-num" id="unpaidCount">0</span>
          <span>Not paid</span>
        </div>
      </section>

      <section class="toolbar">
        <input
          type="search"
          id="search"
          placeholder="Search by student name"
        >

        <select id="classFilter"></select>

        <select id="statusFilter">
          <option value="">All payments</option>
          <option value="PAID">PAID</option>
          <option value="NOT PAID">NOT PAID</option>
        </select>

        <button class="btn primary" id="addBtn">Add student</button>
        <button class="btn outline" id="exportBtn">Export CSV</button>
      </section>

      <p id="message" class="message" role="status"></p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Class</th>
              <th>Parent Name</th>
              <th>Phone</th>
              <th>Amount</th>
              <th>Payment Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="tableBody"></tbody>
        </table>

        <p id="emptyMsg" class="empty" hidden>No students found.</p>
      </div>
    </main>
  </div>

  <!-- Admin Add / Edit Dialog -->
  <dialog id="studentDialog">
    <form id="studentForm" method="dialog">
      <h2 id="dialogTitle">Add student</h2>

      <label for="nameInput">Student Name</label>
      <input type="text" id="nameInput" maxlength="60" required>

      <label for="parentInput">Parent Name</label>
      <input type="text" id="parentInput" maxlength="60">

      <label for="classInput">Class</label>
      <select id="classInput" required></select>

      <label for="phoneInput">Phone Number</label>
      <input type="tel" id="phoneInput" maxlength="10">

      <label for="amountInput">Amount (₹)</label>
      <input type="number" id="amountInput" min="1" step="1">

      <label for="statusInput">Payment Status</label>
      <select id="statusInput" required>
        <option value="NOT PAID">NOT PAID</option>
        <option value="PAID">PAID</option>
      </select>

      <p id="formError" class="error" role="alert"></p>

      <div class="dialog-actions">
        <button type="button" class="btn outline" id="cancelBtn">
          Cancel
        </button>

        <button type="submit" class="btn primary" id="saveBtn">
          Save student
        </button>
      </div>
    </form>
  </dialog>

  <script src="script.js"></script>

  <!-- UPI Payment Button -->
  <script>
    const UPI_ID = "mugil26052016@okicici";
    const PAYEE_NAME = "Shalini Tuition Center";

    const payNowButton = document.getElementById("payNowBtn");

    if (payNowButton) {
      payNowButton.addEventListener("click", function () {
        const upiLink =
          "upi://pay?pa=" + encodeURIComponent(UPI_ID) +
          "&pn=" + encodeURIComponent(PAYEE_NAME) +
          "&cu=INR";

        window.location.href = upiLink;
      });
    }
  </script>

</body>
</html>
```
