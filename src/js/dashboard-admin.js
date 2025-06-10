import {
  getFirestore,
  collectionGroup,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { app } from './firebase-config.js';

const db = getFirestore(app);

let fullNoteList = []; // toàn bộ ghi chú của tháng đang xem

// Khởi động
document.addEventListener('DOMContentLoaded', () => {
  // loadMonthDropdown();
  const now = new Date();
  loadNotesByMonth(now);
  renderCalendarGrid(now); // Chỉ lịch trắng
});

// Tải dữ liệu ghi chú theo tháng
async function loadNotesByMonth(selectedDate) {
  const voteCol = collectionGroup(db, 'votes');
  const snapshot = await getDocs(voteCol);

  fullNoteList = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const note = data.note?.trim();
    const votedAt = data.votedAt;
    if (!note || !votedAt || !votedAt.toDate) return;

    const votedDate = votedAt.toDate();
    if (
      votedDate.getMonth() !== selectedDate.getMonth() ||
      votedDate.getFullYear() !== selectedDate.getFullYear()
    ) return;

    const dd = String(votedDate.getDate()).padStart(2, '0');
    const mm = String(votedDate.getMonth() + 1).padStart(2, '0');
    const yyyy = votedDate.getFullYear();
    const hh = String(votedDate.getHours()).padStart(2, '0');
    const mi = String(votedDate.getMinutes()).padStart(2, '0');

    fullNoteList.push({
      name: data.name || data.userEmail || 'Ẩn danh',
      email: data.userEmail || '–',
      note,
      votedAt: votedDate,
      dateFormatted: `${dd}/${mm}/${yyyy} ${hh}:${mi}`
    });
  });

  fullNoteList.sort((a, b) => b.votedAt - a.votedAt);

  document.getElementById('noteMonthLabel').textContent =
    `${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()}`;

  // renderUserFilter(fullNoteList);
  renderNoteTable(fullNoteList);
}

// Hiển thị danh sách ghi chú ra bảng
function renderNoteTable(data) {
  const tbody = document.getElementById('noteOnlyTableBody');
  tbody.innerHTML = '';
  data.forEach(({ name, email, note, dateFormatted }) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${name}</td>
      <td class="note-cell">${note}</td>
      <td>${dateFormatted}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Tạo lịch tháng đơn giản (không đánh dấu ghi chú)
function renderCalendarGrid(date) {
  const grid = document.getElementById('noteCalendarGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const weekday = d.toLocaleDateString('vi-VN', { weekday: 'short' });

    const cell = document.createElement('div');
    cell.className = 'calendar-day-preview';
    cell.innerHTML = `<strong>${day} (${weekday})</strong>`;
    grid.appendChild(cell);
  }
}
