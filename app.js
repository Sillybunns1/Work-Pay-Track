const BASE_RATE = 20.16;
const EVENING_BONUS = 2;
const NIGHT_BONUS = 3;
const WEEKEND_BONUS = 2;

let currentUser = null;
let shifts = [];

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("loginBtn").addEventListener("click", login);
  document.getElementById("registerBtn").addEventListener("click", register);
  document.getElementById("showRegisterBtn").addEventListener("click", showRegister);
  document.getElementById("showLoginBtn").addEventListener("click", showLogin);
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("addShiftBtn").addEventListener("click", addShift);
});

function showRegister() {
  document.getElementById("loginForm").classList.add("hidden");
  document.getElementById("registerForm").classList.remove("hidden");
}

function showLogin() {
  document.getElementById("registerForm").classList.add("hidden");
  document.getElementById("loginForm").classList.remove("hidden");
}

function register() {
  const username = document.getElementById("registerUsername").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!username || !password || !confirmPassword) {
    alert("Please fill out all registration fields.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  const users = JSON.parse(localStorage.getItem("users") || "{}");

  if (users[username]) {
    alert("That username already exists.");
    return;
  }

  users[username] = { password };
  localStorage.setItem("users", JSON.stringify(users));

  alert("Account created! Please log in.");

  document.getElementById("registerUsername").value = "";
  document.getElementById("registerPassword").value = "";
  document.getElementById("confirmPassword").value = "";

  showLogin();
}

function login() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!username || !password) {
    alert("Please enter your username and password.");
    return;
  }

  const users = JSON.parse(localStorage.getItem("users") || "{}");

  if (!users[username]) {
    alert("Account not found. Please register first.");
    return;
  }

  if (users[username].password !== password) {
    alert("Incorrect password.");
    return;
  }

  currentUser = username;
  shifts = JSON.parse(localStorage.getItem(getShiftKey()) || "[]");

  document.getElementById("loginBox").classList.add("hidden");
  document.getElementById("appBox").classList.remove("hidden");

  render();
}

function logout() {
  currentUser = null;
  shifts = [];

  document.getElementById("appBox").classList.add("hidden");
  document.getElementById("loginBox").classList.remove("hidden");

  showLogin();
}

function getShiftKey() {
  return `shifts_${currentUser}`;
}

function saveShifts() {
  localStorage.setItem(getShiftKey(), JSON.stringify(shifts));
}

function addShift() {
  const date = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const lunchStart = document.getElementById("lunchStart").value;
  const lunchEnd = document.getElementById("lunchEnd").value;

  if (!date || !start || !end) {
    alert("Please enter date, start time, and end time.");
    return;
  }

  shifts.push({ date, start, end, lunchStart, lunchEnd });
  saveShifts();
  render();
}

function deleteShift(index) {
  shifts.splice(index, 1);
  saveShifts();
  render();
}

function calculateShift(shift) {
  let start = new Date(`${shift.date}T${shift.start}`);
  let end = new Date(`${shift.date}T${shift.end}`);

  if (end <= start) end.setDate(end.getDate() + 1);

  let totalMinutes = 0;
  let eveningMinutes = 0;
  let nightMinutes = 0;
  let weekendMinutes = 0;

  let current = new Date(start);

  while (current < end) {
    totalMinutes++;

    const hour = current.getHours();
    const day = current.getDay();

    if (day === 0 || day === 6) weekendMinutes++;
    if (hour >= 18 && hour < 22) eveningMinutes++;
    if (hour >= 22 || hour < 6) nightMinutes++;

    current.setMinutes(current.getMinutes() + 1);
  }

  const totalHours = totalMinutes / 60;
  const eveningHours = eveningMinutes / 60;
  const nightHours = nightMinutes / 60;
  const weekendHours = weekendMinutes / 60;

  const totalPay =
    totalHours * BASE_RATE +
    eveningHours * EVENING_BONUS +
    nightHours * NIGHT_BONUS +
    weekendHours * WEEKEND_BONUS;

  return {
    totalHours,
    eveningHours,
    nightHours,
    weekendHours,
    totalPay
  };
}

function render() {
  let period1HTML = "";
  let period2HTML = "";
  let period1Pay = 0;
  let period2Pay = 0;
  let period1Hours = 0;
  let period2Hours = 0;

  shifts.forEach((shift, index) => {
    const date = new Date(`${shift.date}T00:00`);
    const dayOfMonth = date.getDate();
    const calc = calculateShift(shift);

    const shiftHTML = `
      <div class="shift">
        <strong>${shift.date}</strong><br>
        Shift: ${shift.start}–${shift.end}<br>
        Lunch: ${shift.lunchStart || "None"}–${shift.lunchEnd || "None"}<br>
        Hours: ${calc.totalHours.toFixed(2)}<br>
        Pay: $${calc.totalPay.toFixed(2)}
        <button onclick="deleteShift(${index})">Delete</button>
      </div>
    `;

    if (dayOfMonth <= 15) {
      period1HTML += shiftHTML;
      period1Pay += calc.totalPay;
      period1Hours += calc.totalHours;
    } else {
      period2HTML += shiftHTML;
      period2Pay += calc.totalPay;
      period2Hours += calc.totalHours;
    }
  });

  document.getElementById("period1").innerHTML = period1HTML || "<p>No shifts yet.</p>";
  document.getElementById("period2").innerHTML = period2HTML || "<p>No shifts yet.</p>";

  document.getElementById("total1").innerHTML =
    `Hours: ${period1Hours.toFixed(2)}<br>Total Pay: $${period1Pay.toFixed(2)}`;

  document.getElementById("total2").innerHTML =
    `Hours: ${period2Hours.toFixed(2)}<br>Total Pay: $${period2Pay.toFixed(2)}`;
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}