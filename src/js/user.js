// user.js
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { app } from "./firebase-config.js";
import { handleLogout } from "./auth.js";

// Khởi tạo Auth và Firestore
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Hiển thị tên người dùng ở header.
 * Nếu Firestore có trường 'name', dùng name; ngược lại dùng email.
 */
function displayUserName(name, email) {
  const el = document.getElementById('userNameDisplay');
  if (!el) return;
  const displayName = name?.trim() ? name : email;
  el.textContent = `Xin chào, ${displayName}`;
}

// Khi trạng thái auth thay đổi: kiểm tra role, hiển thị username, load form & kết quả
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Nếu chưa login -> chuyển về trang đăng nhập
    window.location.href = 'index.html';
  } else {
    // Lấy thông tin user từ Firestore
    const docSnap = await getDoc(doc(db, 'users', user.uid));
    if (docSnap.exists()) {
      const userData = docSnap.data();
      // Hiển thị tên/email người dùng
      displayUserName(userData.name, userData.email);

      if (userData.role === 'user') {
        // Hiển thị vùng vote
        document.getElementById('voteSection').style.display = 'block';
        // Hiển thị ngày tuần và load form/kết quả
        document.getElementById('weekStartDate').textContent =
          `Tuần ${getCurrentWeekId().split('-W')[1]} (${currentMonday()})`;
        await renderVoteForm();
        await loadMyVotes();
        bindVoteSubmit();
      } else if (userData.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        alert("Role không hợp lệ!");
        await handleLogout();
        window.location.href = 'index.html';
      }
    } else {
      alert("Không tìm thấy thông tin user!");
      await handleLogout();
      window.location.href = 'index.html';
    }
  }
});

/**
 * Load lịch bình chọn và chấm công của tuần hiện tại, hiển thị lên bảng.
 */
async function loadMyVotes() {
  const user = auth.currentUser;
  if (!user) return;

  const weekId = getCurrentWeekId();
  const voteDoc = await getDoc(doc(db, 'weeks', weekId, 'votes', user.uid));

  // Tính ngày thứ Hai của tuần hiện tại (format dd/mm/yyyy)
  const formattedDate = currentMonday();
  const [year, week] = weekId.split("-W");
  document.getElementById('weekStartDate').textContent =
    `Tuần ${week} (${year}): Ngày bắt đầu ${formattedDate}`;

  if (voteDoc.exists()) {
    const data = voteDoc.data();
    const days = data.days;
    const attendance = data.attendance;
    const confirmed = data.confirmed || {};

    // Hiển thị icon Bình chọn và Chấm công
    for (const [day, value] of Object.entries(days)) {
      const dayElement = document.getElementById(day);
      const checkbox = document.querySelector(`input[value="${day}"]`);

      if (dayElement) {
        if (confirmed[day]) {
          dayElement.textContent = value ? "✅" : "❌";
        } else {
          dayElement.textContent = value ? "✔️" : "–";
        }
      }

      if (checkbox) {
        if (confirmed[day]) {
          checkbox.disabled = true;
          checkbox.closest('.checkbox-label').classList.add('disabled');
        } else {
          checkbox.disabled = false;
          checkbox.closest('.checkbox-label').classList.remove('disabled');
        }
      }
    }

    // Hiển thị ghi chú
    const noteDisplay = document.getElementById('noteContent');
    const note = data.note || "";
    if (noteDisplay) {
      const p = noteDisplay.querySelector('p');
      if (p) p.textContent = note.trim() ? note : "Không có ghi chú.";
    }

    // Hiển thị Chấm công
    for (const [day, value] of Object.entries(attendance)) {
      const dayAttendanceElement = document.getElementById(`${day}Attendance`);
      if (dayAttendanceElement) dayAttendanceElement.textContent = value ? "✔️" : "–";
    }

    // Hiển thị trạng thái đã được admin xác nhận (nếu có)
    const confirmedDays = Object.entries(confirmed)
      .filter(([_, v]) => v)
      .map(([d]) => getDayName(d));
    const confirmEl = document.getElementById('confirmStatus');
    if (confirmedDays.length > 0) {
      confirmEl.textContent = `Các ngày đã được admin xác nhận: ${confirmedDays.join(', ')}`;
    } else {
      confirmEl.textContent = '';
    }
  } else {
    console.log("Chưa có dữ liệu bình chọn và chấm công tuần này.");
  }
}

/**
 * Bind sự kiện submit cho form bình chọn.
 */
function bindVoteSubmit() {
  const form = document.getElementById('voteForm');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert('Bạn chưa đăng nhập!');

    const weekId = getCurrentWeekId();
    const selected = Array.from(
      document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked')
    ).map(cb => cb.dataset.day);
    const note = document.getElementById('note')?.value.trim() || "";

    if (selected.length === 0 && note === "") {
      return alert('Vui lòng chọn ít nhất một ngày hoặc ghi chú lý do!');
    }

    try {
      await saveVote(weekId, selected);
      document.getElementById('voteStatus').textContent = 'Bình chọn đã được lưu!';
      document.getElementById('note').value = "";
    } catch (err) {
      console.error(err);
      alert('Lỗi khi lưu bình chọn.');
    }
  });
}

/**
 * Lưu dữ liệu bình chọn vào Firestore.
 */
async function saveVote(weekId, selectedDays) {
  const u = auth.currentUser;
  const voteRef = doc(db, 'weeks', weekId, 'votes', u.uid);

  const daysObj = { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false };
  selectedDays.forEach(d => {
    if (daysObj.hasOwnProperty(d)) daysObj[d] = true;
  });
  const note = document.getElementById('note')?.value.trim() || "";

  try {
    const userDoc = await getDoc(doc(db, 'users', u.uid));
    const userEmail = userDoc.exists() ? userDoc.data().email : "Unknown";
    const name = userDoc.exists() ? userDoc.data().name : "Ẩn danh";

    await setDoc(voteRef, {
      name: name,
      userEmail: userEmail,
      days: daysObj,
      votedAt: serverTimestamp(),
      note: note,
      attendance: { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false },
      confirmed: { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false }
    });

    document.getElementById('voteStatus').textContent = "Gửi bình chọn thành công!";
    await loadMyVotes();
  } catch (err) {
    console.error(err);
    document.getElementById('voteStatus').textContent = "Lỗi khi gửi bình chọn!";
  }
}

// Xử lý đăng xuất
document.getElementById('logoutBtn').addEventListener('click', async () => {
  const result = await handleLogout();
  if (result.success) {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
  } else {
    alert("Lỗi đăng xuất: " + result.error);
  }
});

/**
 * Tính ngày thứ Hai (format dd/mm/yyyy) của tuần hiện tại.
 */
function currentMonday() {
  const now = new Date();
  const dayOfWeek = now.getDay() || 7; // Chuyển Chủ nhật từ 0 thành 7
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() - dayOfWeek + 1);
  const dd = String(currentMonday.getDate()).padStart(2, '0');
  const mm = String(currentMonday.getMonth() + 1).padStart(2, '0');
  const yyyy = currentMonday.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Tính ISO-week hiện tại dưới dạng "YYYY-Www".
 */
function getCurrentWeekId() {
  const now = new Date();
  const day = now.getDay() || 7; // Sun=0→7
  const thursday = new Date(now);
  thursday.setDate(now.getDate() - (day - 4));
  const year = thursday.getFullYear();
  const firstThu = new Date(year, 0, 1 + ((11 - new Date(year, 0, 1).getDay()) % 7));
  const weekNum = 1 + Math.floor((thursday - firstThu) / (7 * 86400000));
  return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Từ mã ngày ("mon","tue",…) chuyển sang tên hiển thị ("Thứ 2",…).
 */
function getDayName(day) {
  const names = { mon: 'Thứ 2', tue: 'Thứ 3', wed: 'Thứ 4', thu: 'Thứ 5', fri: 'Thứ 6', sat: 'Thứ 7', sun: 'Chủ nhật' };
  return names[day] || day;
}

/**
 * Dựa vào chu kỳ 3 tuần (seedWeek = "2025-W19"), tính xem tuần hiện tại
 * được phép vote những ngày nào (ví dụ mod0 → ['mon','thu','sun'], …).
 */
function computeAllowedDays(weekId, seedWeek = '2025-W19') {
  const [, cur] = weekId.split('-W').map(Number);
  const [, seed] = seedWeek.split('-W').map(Number);
  const d = cur - seed;
  if (d < 0) return [];
  const m = d % 3;
  if (m === 0) return ['mon', 'thu', 'sun'];
  if (m === 1) return ['wed', 'sat'];
  return ['tue', 'fri'];
}

/**
 * Hiển thị tuần và bật/tắt checkbox tương ứng,
 * đồng thời load dữ liệu đã vote trước (nếu có).
 */
async function renderVoteForm() {
  const weekId = getCurrentWeekId();
  const allowed = computeAllowedDays(weekId);
  document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach(cb => {
    const day = cb.dataset.day;
    if (!allowed.includes(day)) {
      cb.disabled = true;
      cb.parentElement.style.opacity = '0.5';
      cb.parentElement.style.textDecoration = 'line-through';
    } else {
      cb.disabled = false;
      cb.parentElement.style.opacity = '';
      cb.parentElement.style.textDecoration = '';
    }
    cb.checked = false;
  });

  // Nếu đã vote trước, check lại
  const user = auth.currentUser;
  const ref = doc(db, 'weeks', weekId, 'votes', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const days = snap.data().days;
    for (let [day, val] of Object.entries(days)) {
      const input = document.querySelector(`.checkbox-group input[data-day="${day}"]`);
      if (input && val) input.checked = true;
    }
  }
}
