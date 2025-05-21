import {
    getFirestore,
    getDocs,
    doc,
    getDoc,
    collection
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { app } from "./firebase-config.js";

const db = getFirestore(app);

const weekdayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getWeekId(year, week) {
    return `${year}-W${week.toString().padStart(2, '0')}`;
}

async function renderDutyCalendar(month, year) {
    const calendarGrid = document.querySelector(".calendar-grid");
    if (!calendarGrid) return;

    // Clear grid
    calendarGrid.innerHTML = "";

    // Render header
    const weekNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    for (let w of weekNames) {
        const div = document.createElement("div");
        div.className = "day-header";
        div.textContent = w;
        calendarGrid.appendChild(div);
    }

    // Get all days in month
    const firstDate = new Date(year, month - 1, 1);
    const lastDate = new Date(year, month, 0);
    const dayCount = lastDate.getDate();

    const startWeekDay = firstDate.getDay();

    const days = [];
    for (let i = 1; i <= dayCount; i++) {
        const d = new Date(year, month - 1, i);
        days.push(d);
    }

    // Padding start
    for (let i = 0; i < startWeekDay; i++) {
        const div = document.createElement("div");
        div.className = "day-cell disabled";
        calendarGrid.appendChild(div);
    }

    // Fetch all votes for each day
    const cache = {}; // weekId => votes[]
    for (const d of days) {
        const week = getWeekNumber(d);
        const weekId = getWeekId(year, week);
        if (!cache[weekId]) {
            const qSnap = await getDocs(collection(db, "weeks", weekId, "votes"));
            cache[weekId] = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
    }

    for (const d of days) {
        const week = getWeekNumber(d);
        const weekId = getWeekId(year, week);
        const votes = cache[weekId] || [];

        const dayIdx = d.getDay(); // 0-6
        const key = weekdayKeys[dayIdx];

        const cell = document.createElement("div");
        cell.className = "day-cell";
        const number = document.createElement("div");
        number.className = "day-number";
        number.textContent = d.getDate();
        cell.appendChild(number);

        const content = document.createElement("div");
        content.className = "day-content";

        votes.forEach(vote => {
            // nếu muốn chấm xong mới đi thì cái nì
            // if (vote.days?.[key] && vote.attendance?.[key] && vote.confirmed?.[key]) {
            if (vote.days?.[key]) {
                const pill = document.createElement("div");
                pill.className = "duty-pill";
                pill.textContent = vote.name || vote.userEmail || "Ẩn danh";
                content.appendChild(pill);
            }
        });

        cell.appendChild(content);
        calendarGrid.appendChild(cell);
    }

    updateMonthIndicator(month, year);
}

// Auto init for current month
document.addEventListener("DOMContentLoaded", () => {
    const today = new Date();
    renderDutyCalendar(today.getMonth() + 1, today.getFullYear());
});

function updateMonthIndicator(month, year) {
  const label = document.querySelector(".month-indicator");
  if (label) label.textContent = `Tháng ${month}/${year}`;
}

// document.addEventListener("DOMContentLoaded", () => {
//     const today = new Date();
//     renderDutyCalendar(today.getMonth() + 1, today.getFullYear());
//     updateMonthIndicator(today.getMonth() + 1, today.getFullYear());

//     // Nếu cần khởi tạo dropdown hoặc dữ liệu gì khác thì làm tại đây luôn
// });

document.getElementById('prevMonthBtn')?.addEventListener('click', () => {
  shiftMonth(-1);
});
document.getElementById('nextMonthBtn')?.addEventListener('click', () => {
  shiftMonth(1);
});

function shiftMonth(delta) {
  const select = document.getElementById('monthSelect');
  if (!select) return;

  const current = select.value.split('-');
  let year = parseInt(current[0]);
  let month = parseInt(current[1]);

  month += delta;
  if (month < 1) {
    month = 12;
    year -= 1;
  } else if (month > 12) {
    month = 1;
    year += 1;
  }

  const newValue = `${year}-${month.toString().padStart(2, '0')}`;
  const optionExists = Array.from(select.options).some(opt => opt.value === newValue);

  if (!optionExists) {
    const opt = document.createElement('option');
    opt.value = newValue;
    opt.textContent = `Tháng ${month}/${year}`;
    select.appendChild(opt);
  }

  select.value = newValue;

  const selectedDate = new Date(year, month - 1, 1);
  // loadNotesByMonth(selectedDate);
  // renderCalendarGrid(selectedDate);
  renderDutyCalendar(month, year);
  updateMonthIndicator(month, year);
}


// import {
//   getFirestore,
//   getDocs,
//   collection
// } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
// import { app } from "./firebase-config.js";

// const db = getFirestore(app);
// const weekdayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// function getWeekNumber(date) {
//   const d = new Date(date);
//   d.setHours(0, 0, 0, 0);
//   d.setDate(d.getDate() + 4 - (d.getDay() || 7));
//   const yearStart = new Date(d.getFullYear(), 0, 1);
//   return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
// }

// function getWeekId(year, week) {
//   return `${year}-W${week.toString().padStart(2, '0')}`;
// }

// async function renderDutyCalendar(month, year) {
//   const calendarGrid = document.querySelector(".calendar-grid");
//   if (!calendarGrid) return;
//   calendarGrid.innerHTML = "";

//   const weekNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
//   for (let w of weekNames) {
//     const div = document.createElement("div");
//     div.className = "day-header";
//     div.textContent = w;
//     calendarGrid.appendChild(div);
//   }

//   const firstDate = new Date(year, month - 1, 1);
//   const lastDate = new Date(year, month, 0);
//   const totalDays = lastDate.getDate();
//   const startDay = firstDate.getDay();

//   const days = [];
//   for (let i = 1; i <= totalDays; i++) {
//     days.push(new Date(year, month - 1, i));
//   }

//   for (let i = 0; i < startDay; i++) {
//     const cell = document.createElement("div");
//     cell.className = "day-cell disabled";
//     calendarGrid.appendChild(cell);
//   }

//   // Cache tất cả dữ liệu tuần trong tháng
//   const cache = {};
//   for (const d of days) {
//     const week = getWeekNumber(d);
//     const weekId = getWeekId(year, week);
//     if (!cache[weekId]) {
//       const snap = await getDocs(collection(db, "weeks", weekId, "votes"));
//       cache[weekId] = snap.docs.map(doc => doc.data());
//     }
//   }

//   for (const d of days) {
//     const weekId = getWeekId(year, getWeekNumber(d));
//     const votes = cache[weekId] || [];
//     const key = weekdayKeys[d.getDay()];

//     const cell = document.createElement("div");
//     cell.className = "day-cell";

//     const number = document.createElement("div");
//     number.className = "day-number";
//     number.textContent = d.getDate();
//     cell.appendChild(number);

//     const content = document.createElement("div");
//     content.className = "day-content";

//     votes.forEach(vote => {
//       if (vote.days?.[key]) {
//         const pill = document.createElement("div");
//         const isAttended = vote.attendance?.[key];
//         const isConfirmed = vote.confirmed?.[key];

//         // Tô màu và biểu tượng
//         if (isAttended && isConfirmed) {
//           pill.className = "duty-pill pill-attended";
//           pill.innerHTML = `<i class="fas fa-check pill-icon"></i>${vote.userEmail}`;
//         } else {
//           pill.className = "duty-pill pill-vote";
//           pill.innerHTML = `<i class="fas fa-clock pill-icon"></i>${vote.userEmail}`;
//         }

//         content.appendChild(pill);
//       }
//     });

//     cell.appendChild(content);
//     calendarGrid.appendChild(cell);
//   }
// }

// // Tự động load tháng hiện tại
// document.addEventListener("DOMContentLoaded", () => {
//   const monthSelect = document.getElementById("monthSelect");
//   const yearSelect = document.getElementById("yearSelect");
//   const now = new Date();
//   const m = now.getMonth() + 1;
//   const y = now.getFullYear();

//   // Init dropdowns
//   for (let i = 1; i <= 12; i++) {
//     const opt = document.createElement("option");
//     opt.value = i;
//     opt.textContent = `Tháng ${i}`;
//     monthSelect.appendChild(opt);
//   }

//   for (let i = y - 2; i <= y + 1; i++) {
//     const opt = document.createElement("option");
//     opt.value = i;
//     opt.textContent = `Năm ${i}`;
//     yearSelect.appendChild(opt);
//   }

//   monthSelect.value = m;
//   yearSelect.value = y;

//   document.getElementById("loadCalendarBtn").addEventListener("click", () => {
//     renderDutyCalendar(+monthSelect.value, +yearSelect.value);
//   });

//   renderDutyCalendar(m, y);
// });
