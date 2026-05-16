const BASE_RATE = 20.16;
const EVENING_BONUS = 2;
const NIGHT_BONUS = 3;
const WEEKEND_BONUS = 2;

let currentUser = null;
let shifts = [];

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

  let users = JSON.parse(localStorage.getItem("users") || "{}");

  if (users[username]) {
    alert("That username already exists.");
    return;
  }

  users[username] = { password };
  localStorage.setItem("users", JSON.stringify(users));

  alert("Account created! You can now log in.");

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

  let users = JSON.parse(localStorage.getItem("users") || "{}");

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

  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";

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

  if ((lunchStart && !lunchEnd) || (!lunchStart && lunchEnd)) {
    alert("Please enter both lunch start and lunch end.");
    return;
  }

  shifts.push({
    date,
    start,
    end,
    lunchStart,
    lunchEnd
  });

  saveShifts();
  clearForm();
  render();
}

function clearForm() {
  document.getElementById("date").value = "";
  document.getElementById("start").value = "";
  document.getElementById("end").value = "";
  document.getElementById("lunchStart").value = "";
  document.getElementById("lunchEnd").value = "";
}

function deleteShift(index) {
  shifts.splice(index, 1);
  saveShifts();
  render();
}

function calculateShift(shift) {
  let start = new Date(`${shift.date}T${shift.start}`);
  let end = new Date(`${shift.date}T${shift.end}`);

  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  let lunchStart = null;
  let lunchEnd = null;

  if (shift.lunchStart && shift.lunchEnd) {
    lunchStart = new Date(`${shift.date}T${shift.lunchStart}`);
    lunchEnd = new Date(`${shift.date}T${shift.lunchEnd}`);

    if (lunchEnd <= lunchStart) {
      lunchEnd.setDate(lunchEnd.getDate() + 1);
    }
  }

  let totalMinutes = 0;
  let eveningMinutes = 0;
  let nightMinutes = 0;
  let weekendMinutes = 0;

  let current = new Date(start);

  while (current < end) {
    const isDuringLunch =
      lunchStart &&
      lunchEnd &&
      current >= lunchStart &&
      current < lunchEnd;

    if (!isDuringLunch) {
      totalMinutes++;

      const hour = current.getHours();
      const day = current.getDay();

      if (day === 0 || day === 6) {
        weekendMinutes++;
      }

      if (hour >= 18 && hour < 22) {
        eveningMinutes++;
      }

      if (hour >= 22 || hour < 6) {
        nightMinutes++;
      }
    }

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

    const lunchText =
      shift.lunchStart && shift.lunchEnd
        ? `Lunch: ${shift.lunchStart}–${shift.lunchEnd}`
        : "No lunch";

    const shiftHTML = `
      <div class="shift">
        <strong>${shift.date}</strong><br>
        Shift: ${shift.start}–${shift.end}<br>
        ${lunchText}<br>
        Hours: ${calc.totalHours.toFixed(2)}<br>
        Evening +$2 Hours: ${calc.eveningHours.toFixed(2)}<br>
        Night +$3 Hours: ${calc.nightHours.toFixed(2)}<br>
        Weekend +$2 Hours: ${calc.weekendHours.toFixed(2)}<br>
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

  document.getElementById("period1").innerHTML =
    period1HTML || "<p>No shifts yet.</p>";

  document.getElementById("period2").innerHTML =
    period2HTML || "<p>No shifts yet.</p>";

  document.getElementById("total1").innerHTML =
    `Hours: ${period1Hours.toFixed(2)}<br>Total Pay: $${period1Pay.toFixed(2)}`;

  document.getElementById("total2").innerHTML =
    `Hours: ${period2Hours.toFixed(2)}<br>Total Pay: $${period2Pay.toFixed(2)}`;
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => console.log("Service Worker registered"))
    .catch(error => console.log("Service Worker error:", error));
}