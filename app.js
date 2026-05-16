const SUPABASE_URL = "https://ppvwsaabespyvbdlkmgz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_tM2j7A9uuLuxc3utGQTa5g_CEdl27PP";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const BASE_RATE = 20.16;
const EVENING_BONUS = 2;
const NIGHT_BONUS = 3;

let currentUser = null;
let shifts = [];

const $ = (id) => document.getElementById(id);

function setMessage(text) {
  $("authMessage").textContent = text;
}

function parseLocal(date, time) {
  return new Date(`${date}T${time}`);
}

function getShiftSegments(shift) {
  let start = parseLocal(shift.date, shift.start);
  let end = parseLocal(shift.date, shift.end);

  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  let lunchStart = shift.lunchStart
    ? parseLocal(shift.date, shift.lunchStart)
    : null;

  let lunchEnd = shift.lunchEnd
    ? parseLocal(shift.date, shift.lunchEnd)
    : null;

  if (lunchStart && lunchEnd && lunchEnd <= lunchStart) {
    lunchEnd.setDate(lunchEnd.getDate() + 1);
  }

  const segments = [];

  for (let cursor = new Date(start); cursor < end;) {
    const next = new Date(
      Math.min(cursor.getTime() + 15 * 60 * 1000, end.getTime())
    );

    const isLunch =
      lunchStart &&
      lunchEnd &&
      cursor < lunchEnd &&
      next > lunchStart;

    if (!isLunch) {
      segments.push([new Date(cursor), new Date(next)]);
    }

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

  if (isNight) {
    return BASE_RATE + NIGHT_BONUS;
  }

  if (isWeekend || isEvening) {
    return BASE_RATE + EVENING_BONUS;
  }

  return BASE_RATE;
}

function calculateShift(shift) {
  const totals = {
    baseHours: 0,
    eveningHours: 0,
    nightHours: 0,
    pay: 0
  };

  getShiftSegments(shift).forEach(([start, end]) => {
    const hours = (end - start) / 36e5;
    const rate = rateFor(start);

    totals.pay += hours * rate;

    if (rate === BASE_RATE + NIGHT_BONUS) {
      totals.nightHours += hours;
    } else if (rate === BASE_RATE + EVENING_BONUS) {
      totals.eveningHours += hours;
    } else {
      totals.baseHours += hours;
    }
  });

  totals.hours =
    totals.baseHours +
    totals.eveningHours +
    totals.nightHours;

  return totals;
}

function currentPayPeriod(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const day = date.getDate();

  const startDay = day <= 15 ? 1 : 16;
  const endDay =
    day <= 15
      ? 15
      : new Date(y, m + 1, 0).getDate();

  return `${m + 1}/${startDay}/${y} - ${m + 1}/${endDay}/${y}`;
}

function nextPayday(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const day = date.getDate();

  if (day < 8) {
    return `${m + 1}/8/${y}`;
  }

  if (day < 23) {
    return `${m + 1}/23/${y}`;
  }

  const next = new Date(y, m + 1, 8);

  return `${next.getMonth() + 1}/8/${next.getFullYear()}`;
}

async function register() {
  const email = $("username").value.trim();
  const password = $("password").value;

  if (!email || !password) {
    return setMessage("Enter an email and password.");
  }

  const { error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    return setMessage(error.message);
  }

  setMessage(
    "Account created! Check your email if confirmation is enabled."
  );
}

async function login() {
  const email = $("username").value.trim();
  const password = $("password").value;

  if (!email || !password) {
    return setMessage("Enter an email and password.");
  }

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    return setMessage(error.message);
  }

  currentUser = data.user;

  $("authBox").classList.add("hidden");
  $("appBox").classList.remove("hidden");

  $("welcomeText").textContent =
    `Logged in as ${currentUser.email}`;

  await loadShifts();
}

async function logout() {
  await supabaseClient.auth.signOut();

  currentUser = null;
  shifts = [];

  $("password").value = "";

  $("authBox").classList.remove("hidden");
  $("appBox").classList.add("hidden");
}

async function loadShifts() {
  const { data, error } = await supabaseClient
    .from("shifts")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    return alert(error.message);
  }

  shifts = data.map((row) => ({
    id: row.id,
    date: row.date,
    start: row.start_time,
    end: row.end_time,
    lunchStart: row.lunch_start,
    lunchEnd: row.lunch_end
  }));

  render();
}

async function addShift(event) {
  event.preventDefault();

  const shift = {
    date: $("date").value,
    start: $("start").value,
    end: $("end").value,
    lunchStart: $("lunchStart").value,
    lunchEnd: $("lunchEnd").value
  };

  if (!shift.date || !shift.start || !shift.end) {
    return alert("Missing date, start, or end.");
  }

  if (
    (shift.lunchStart && !shift.lunchEnd) ||
    (!shift.lunchStart && shift.lunchEnd)
  ) {
    return alert(
      "Add both lunch start and lunch end, or leave both blank."
    );
  }

  const { error } = await supabaseClient
    .from("shifts")
    .insert({
      user_id: currentUser.id,
      date: shift.date,
      start_time: shift.start,
      end_time: shift.end,
      lunch_start: shift.lunchStart || null,
      lunch_end: shift.lunchEnd || null
    });

  if (error) {
    return alert(error.message);
  }

  $("shiftForm").reset();

  await loadShifts();
}

async function deleteShift(index) {
  const shift = shifts[index];

  const { error } = await supabaseClient
    .from("shifts")
    .delete()
    .eq("id", shift.id);

  if (error) {
    return alert(error.message);
  }

  await loadShifts();
}

async function clearShifts() {
  if (!confirm("Delete all shifts for this user?")) {
    return;
  }

  const { error } = await supabaseClient
    .from("shifts")
    .delete()
    .eq("user_id", currentUser.id);

  if (error) {
    return alert(error.message);
  }

  shifts = [];

  render();
}

function render() {
  const list = $("shiftList");

  let totalHours = 0;
  let totalPay = 0;

  $("periodLabel").textContent =
    currentPayPeriod();

  $("paydayLabel").textContent =
    nextPayday();

  if (!shifts.length) {
    list.innerHTML =
      `<p class="muted">No shifts yet.</p>`;
  } else {
    list.innerHTML = shifts
      .map((shift, index) => {
        const calc = calculateShift(shift);

        totalHours += calc.hours;
        totalPay += calc.pay;

        return `
          <article class="shift">
            <strong>
              ${shift.date} • ${shift.start} - ${shift.end}
            </strong>

            <div class="details">
              Hours: ${calc.hours.toFixed(2)}
              | Pay: $${calc.pay.toFixed(2)}<br>

              Base:
              ${calc.baseHours.toFixed(2)}h •

              Weekend/Evening:
              ${calc.eveningHours.toFixed(2)}h •

              Night:
              ${calc.nightHours.toFixed(2)}h
              <br>

              Lunch:
              ${
                shift.lunchStart && shift.lunchEnd
                  ? `${shift.lunchStart} - ${shift.lunchEnd}`
                  : "None"
              }
            </div>

            <button
              class="danger small"
              type="button"
              onclick="deleteShift(${index})"
            >
              Delete
            </button>
          </article>
        `;
      })
      .join("");
  }

  $("totalHours").textContent =
    totalHours.toFixed(2);

  $("totalPay").textContent =
    `$${totalPay.toFixed(2)}`;
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch(console.error);
  }
}

$("loginBtn").addEventListener(
  "click",
  login
);

$("registerBtn").addEventListener(
  "click",
  register
);

$("logoutBtn").addEventListener(
  "click",
  logout
);

$("shiftForm").addEventListener(
  "submit",
  addShift
);

$("clearBtn").addEventListener(
  "click",
  clearShifts
);

registerServiceWorker();

async function restoreSession() {
  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  if (user) {
    currentUser = user;

    $("authBox").classList.add("hidden");
    $("appBox").classList.remove("hidden");

    $("welcomeText").textContent =
      `Logged in as ${currentUser.email}`;

    await loadShifts();
  }
}
restoreSession();