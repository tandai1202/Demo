// // schedule.js
// import { db } from './src/js/firebase-config.js';
// import { collection, getDocs } from 'firebase/firestore';

// async function loadSchedule() {
//   // Giả sử collection 'votes' lưu document với { fullName: string, days: ['mon','wed',...] }
//   const snaps = await getDocs(collection(db, 'votes'));
//   const schedule = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };

//   snaps.forEach(doc => {
//     const { fullName, days } = doc.data();
//     days.forEach(d => {
//       if (schedule[d]) schedule[d].push(fullName);
//     });
//   });

//   const order = ['mon','tue','wed','thu','fri','sat','sun'];
//   const tbody = document.getElementById('scheduleBody');
//   const tr = document.createElement('tr');

//   order.forEach(day => {
//     const td = document.createElement('td');
//     td.textContent = schedule[day].length
//       ? schedule[day].join(', ')
//       : '–';
//     tr.appendChild(td);
//   });
//   tbody.appendChild(tr);
// }

// window.addEventListener('DOMContentLoaded', loadSchedule);


// src/js/schedule.js
import { db } from './firebase-config.js';
import {
  collection,
  getDocs,
  updateDoc,
  doc
} from 'firebase/firestore';

// Lấy số tuần ISO
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Tạo options cho bộ chọn tuần & năm
function populateFilters() {
  const weekSelect = document.getElementById('weekSelect');
  const yearSelect = document.getElementById('yearSelect');
  const now = new Date();
  const currentYear = now.getFullYear();

  for (let y = currentYear - 1; y <= currentYear + 1; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }
  const currentWeek = getWeekNumber(now);
  for (let w = 1; w <= 52; w++) {
    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = `Tuần ${w}`;
    if (w === currentWeek) opt.selected = true;
    weekSelect.appendChild(opt);
  }
}

// Load dữ liệu từ Firestore và xây bảng
async function loadTable() {
  const week = document.getElementById('weekSelect').value;
  const year = document.getElementById('yearSelect').value;
  const snaps = await getDocs(collection(db, 'votes'));
  const rows = [];

  snaps.forEach(snap => {
    const data = snap.data();
    if (data.week == week && data.year == year) {
      rows.push({
        id: snap.id,
        fullName: data.fullName,
        days: data.days
      });
    }
  });

  const tbody = document.querySelector('#allInOneTable tbody');
  tbody.innerHTML = '';

  rows.forEach(item => {
    const tr = document.createElement('tr');
    // Col: User
    let td = document.createElement('td');
    td.textContent = item.fullName;
    tr.appendChild(td);

    // Cột các ngày
    ['mon','tue','wed','thu','fri','sat','sun'].forEach(day => {
      const tdDay = document.createElement('td');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = item.days.includes(day);
      cb.dataset.id = item.id;
      cb.dataset.day = day;
      tdDay.appendChild(cb);
      tr.appendChild(tdDay);
    });

    // Tổng
    td = document.createElement('td');
    td.textContent = item.days.length;
    tr.appendChild(td);

    // Báo cáo (link mẫu)
    td = document.createElement('td');
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = 'Xem';
    td.appendChild(a);
    tr.appendChild(td);

    tbody.appendChild(tr);
  });
}

// Lưu thay đổi checkbox về Firestore
async function saveChanges() {
  const checks = document.querySelectorAll('#allInOneTable tbody input[type=checkbox]');
  const batch = {};
  checks.forEach(cb => {
    const id = cb.dataset.id;
    if (!batch[id]) batch[id] = [];
    if (cb.checked) batch[id].push(cb.dataset.day);
  });

  for (const id in batch) {
    await updateDoc(doc(db, 'votes', id), { days: batch[id] });
  }
  alert('Đã lưu thay đổi');
}

// Khởi tạo
window.addEventListener('DOMContentLoaded', () => {
  populateFilters();
  loadTable();
  document.getElementById('weekSelect').addEventListener('change', loadTable);
  document.getElementById('yearSelect').addEventListener('change', loadTable);
  document.getElementById('saveChangesBtn').addEventListener('click', saveChanges);
});