const BASE_RATE = 20.16;
const EVENING_BONUS = 2;      // Weekends or 6 PM - 10 PM
const NIGHT_BONUS = 3;        // Any day 10 PM - 6 AM

let currentUser = localStorage.getItem("currentUser") || null;
let shifts = [];

const $ = (id) => document.getElementById(id);

function users() {
  return JSON.parse(localStorage.getItem("users") || "{}");
}

function saveUsers(data) {
  localStorage.setItem("users", JSON.stringify(data));
}

function shiftKey() {
  return `shifts_${currentUser}`;
}

function setMessage(text) {
  $("authMessage").textContent = text;
}

function register() {
  const username = $("username").value.trim();
  const password = $("password").value;
  if (!username || !password) return setMessage("Enter a username and password.");

  const allUsers = users();
  if (allUsers[username]) return setMessage("That username already exists. Try logging in.");

  allUsers[username] = { password };
  saveUsers(allUsers);
  login(true);
}

function login(fromRegister = false) {
  const username = $("username").value.trim();
  const password = $("password").value;
  if (!username || !password) return setMessage("Enter a username and password.");

  const allUsers = users();
  if (!allUsers[username]) return setMessage("Account not found. Use Register first.");
  if (allUsers[username].password !== password) return setMessage("Wrong password.");

  currentUser = username;
  localStorage.setItem("currentUser", currentUser);
  shifts = JSON.parse(localStorage.getItem(shiftKey()) || "[]");
  $("authBox").classList.add("hidden");
  $("appBox").classList.remove("hidden");
  $("welcomeText").textContent = fromRegister ? `Welcome, ${currentUser}!` : `Logged in as ${currentUser}`;
  render();
}

function logout() {
  currentUser = null;
  shifts = [];
  localStorage.removeItem("currentUser");
  $("password").value = "";
  $("authBox").classList.remove("hidden");
  $("appBox").classList.add("hidden");
}

function saveShifts() {
  localStorage.setItem(shiftKey(), JSON.stringify(shifts));
}

function parseLocal(date, time) {
  return new Date(`${date}T${time}`);
}

function getShiftSegments(shift) {
  let start = parseLocal(shift.date, shift.start);
  let end = parseLocal(shift.date, shift.end);
  if (end <= start) end.setDate(end.getDate() + 1);

  let lunchStart = shift.lunchStart ? parseLocal(shift.date, shift.lunchStart) : null;
  let lunchEnd = shift.lunchEnd ? parseLocal(shift.date, shift.lunchEnd) : null;
  if (lunchStart && lunchEnd && lunchEnd <= lunchStart) lunchEnd.setDate(lunchEnd.getDate() + 1);

  const segments = [];
  for (let cursor = new Date(start); cursor < end;) {
    const next = new Date(Math.min(cursor.getTime() + 15 * 60 * 1000, end.getTime()));
    const isLunch = lunchStart && lunchEnd && cursor < lunchEnd && next > lunchStart;
    if (!isLunch) segments.push([new Date(cursor), new Date(next)]);
    cursor = next;
  }
  return segments;
}

function rateFor(dateObj) {
  const day = dateObj.getDay();
  const hour = dateObj.getHours() + dateObj.getMinutes() / 60;
  const isWeekend = day === 0 || day === 6;
  const isEvening = hour >= 18 && hour < 22;
  const isNight = hour >= 22 || hour < 6;

  if (isNight) return BASE_RATE + NIGHT_BONUS;
  if (isWeekend || isEvening) return BASE_RATE + EVENING_BONUS;
  return BASE_RATE;
}

function calculateShift(shift) {
  const totals = { baseHours: 0, eveningHours: 0, nightHours: 0, pay: 0 };
  getShiftSegments(shift).forEach(([start, end]) => {
    const hours = (end - start) / 36e5;
    const rate = rateFor(start);
    totals.pay += hours * rate;
    if (rate === BASE_RATE + NIGHT_BONUS) totals.nightHours += hours;
    else if (rate === BASE_RATE + EVENING_BONUS) totals.eveningHours += hours;
    else totals.baseHours += hours;
  });
  totals.hours = totals.baseHours + totals.eveningHours + totals.nightHours;
  return totals;
}

function currentPayPeriod(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const day = date.getDate();
  const startDay = day <= 15 ? 1 : 16;
  const endDay = day <= 15 ? 15 : new Date(y, m + 1, 0).getDate();
  return `${m + 1}/${startDay}/${y} - ${m + 1}/${endDay}/${y}`;
}

function nextPayday(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const day = date.getDate();
  if (day < 8) return `${m + 1}/8/${y}`;
  if (day < 23) return `${m + 1}/23/${y}`;
  const next = new Date(y, m + 1, 8);
  return `${next.getMonth() + 1}/8/${next.getFullYear()}`;
}

function addShift(event) {
  event.preventDefault();
  const shift = {
    date: $("date").value,
    start: $("start").value,
    end: $("end").value,
    lunchStart: $("lunchStart").value,
    lunchEnd: $("lunchEnd").value
  };
  if (!shift.date || !shift.start || !shift.end) return alert("Missing date, start, or end.");
  if ((shift.lunchStart && !shift.lunchEnd) || (!shift.lunchStart && shift.lunchEnd)) return alert("Add both lunch start and lunch end, or leave both blank.");

  shifts.push(shift);
  saveShifts();
  $("shiftForm").reset();
  render();
}

function deleteShift(index) {
  shifts.splice(index, 1);
  saveShifts();
  render();
}

function clearShifts() {
  if (!confirm("Delete all shifts for this user?")) return;
  shifts = [];
  saveShifts();
  render();
}

function render() {
  const list = $("shiftList");
  let totalHours = 0;
  let totalPay = 0;

  $("periodLabel").textContent = currentPayPeriod();
  $("paydayLabel").textContent = nextPayday();

  if (!shifts.length) {
    list.innerHTML = `<p class="muted">No shifts yet.</p>`;
  } else {
    list.innerHTML = shifts.map((shift, index) => {
      const calc = calculateShift(shift);
      totalHours += calc.hours;
      totalPay += calc.pay;
      return `
        <article class="shift">
          <strong>${shift.date} • ${shift.start} - ${shift.end}</strong>
          <div class="details">
            Hours: ${calc.hours.toFixed(2)} | Pay: $${calc.pay.toFixed(2)}<br>
            Base: ${calc.baseHours.toFixed(2)}h • Weekend/Evening: ${calc.eveningHours.toFixed(2)}h • Night: ${calc.nightHours.toFixed(2)}h<br>
            Lunch: ${shift.lunchStart && shift.lunchEnd ? `${shift.lunchStart} - ${shift.lunchEnd}` : "None"}
          </div>
          <button class="danger small" type="button" onclick="deleteShift(${index})">Delete</button>
        </article>`;
    }).join("");
  }

  $("totalHours").textContent = totalHours.toFixed(2);
  $("totalPay").textContent = `$${totalPay.toFixed(2)}`;
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(console.error);
  }
}

$("loginBtn").addEventListener("click", () => login(false));
$("registerBtn").addEventListener("click", register);
$("logoutBtn").addEventListener("click", logout);
$("shiftForm").addEventListener("submit", addShift);
$("clearBtn").addEventListener("click", clearShifts);

registerServiceWorker();
if (currentUser) {
  shifts = JSON.parse(localStorage.getItem(shiftKey()) || "[]");
  $("authBox").classList.add("hidden");
  $("appBox").classList.remove("hidden");
  $("welcomeText").textContent = `Logged in as ${currentUser}`;
  render();
}
