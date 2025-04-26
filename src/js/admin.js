import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { app } from "./firebase-config.js";
import { handleLogout, createUserByAdmin } from "./auth.js";

// Khởi tạo Firebase
const auth = getAuth(app);
const db = getFirestore(app);

// Mảng ngày trong tuần để duyệt
const dayList = ['mon','tue','wed','thu','fri','sat','sun'];

// Object lưu trữ thay đổi tạm thời
let tempChanges = {};

// Hàm tính ngày bắt đầu và kết thúc của tuần theo ISO (Thứ 2 - Chủ Nhật)
function getDateRangeOfWeek(week, year) {
  // Tính ngày đầu tiên của năm
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dayOfWeek = simple.getDay(); // 0 (Chủ Nhật) đến 6 (Thứ Bảy)
  const ISOweekStart = new Date(simple);
  // Điều chỉnh để lấy Thứ 2 của tuần theo chuẩn ISO 8601:
  if (dayOfWeek <= 4) { 
    ISOweekStart.setDate(simple.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  } else {
    ISOweekStart.setDate(simple.getDate() + (8 - dayOfWeek));
  }
  const ISOweekEnd = new Date(ISOweekStart);
  ISOweekEnd.setDate(ISOweekStart.getDate() + 6);
  return {
    start: ISOweekStart,
    end: ISOweekEnd
  };
}

function initializeDateSelectors() {
  const weekSelect = document.getElementById('weekSelect');
  const yearSelect = document.getElementById('yearSelect');
  
  const currentYear = new Date().getFullYear();
  for (let year = 2024; year <= currentYear + 1; year++) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  }
  yearSelect.value = currentYear;

  // Tạo options cho tuần (1-53)
  for (let week = 1; week <= 53; week++) {
    const option = document.createElement('option');
    option.value = week;
    
    const { start, end } = getDateRangeOfWeek(week, currentYear);
    // Sử dụng định dạng ngày theo locale Việt Nam (dd/mm/yyyy)
    const startStr = start.toLocaleDateString('vi-VN');
    const endStr = end.toLocaleDateString('vi-VN');
    option.textContent = `Tuần ${week} (${startStr} - ${endStr})`;
    
    weekSelect.appendChild(option);
  }
  // Thiết lập tuần hiện tại theo thuật toán hiện có (có thể giữ hàm getWeekNumber như đang có)
  const currentWeek = getWeekNumber(new Date());
  weekSelect.value = currentWeek;

  weekSelect.addEventListener('change', () => {
    listenRealTimeVotes();
    updateTableHeaders();
  });
  yearSelect.addEventListener('change', () => {
    // Khi năm thay đổi, cần cập nhật lại options của tuần theo năm được chọn:
    refreshWeekOptions();
    listenRealTimeVotes();
    updateTableHeaders();
  });
}

// Hàm cập nhật lại options của tuần khi năm thay đổi
function refreshWeekOptions() {
  const weekSelect = document.getElementById('weekSelect');
  weekSelect.innerHTML = ''; // Xóa toàn bộ options cũ
  const currentYear = parseInt(document.getElementById('yearSelect').value);
  for (let week = 1; week <= 53; week++) {
    const option = document.createElement('option');
    option.value = week;
    const { start, end } = getDateRangeOfWeek(week, currentYear);
    const startStr = start.toLocaleDateString('vi-VN');
    const endStr = end.toLocaleDateString('vi-VN');
    option.textContent = `Tuần ${week} (${startStr} - ${endStr})`;
    weekSelect.appendChild(option);
  }
  // Nếu cần, có thể cập nhật lại tuần hiện tại
  const currentWeek = getWeekNumber(new Date());
  weekSelect.value = currentWeek;
}

function updateTableHeaders() {
  const year = parseInt(document.getElementById('yearSelect').value);
  const week = parseInt(document.getElementById('weekSelect').value);
  const { start } = getDateRangeOfWeek(week, year);
  // Các header trong bảng: cột đầu tiên (User) giữ nguyên, 7 cột ngày trong tuần, sau đó là “Tổng” và “Báo cáo”
  const headerCells = document.querySelectorAll('#allInOneTable thead th');
  const daysOfWeek = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
  
  daysOfWeek.forEach((dayText, index) => {
    const tempDate = new Date(start);
    tempDate.setDate(tempDate.getDate() + index);
    const formattedDate = tempDate.toLocaleDateString('vi-VN'); // định dạng dd/mm/yyyy
    // Vì headerCells[0] là "User", bắt đầu từ index 1 cho ngày
    headerCells[index+1].textContent = `${dayText} (${formattedDate})`;
  });
}


onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    const docSnap = await getDoc(doc(db, 'users', user.uid));
    if (docSnap.exists()) {
      const userData = docSnap.data();
      if (userData.role !== 'admin') {
        alert("Bạn không có quyền truy cập trang admin!");
        window.location.href = "index.html";
      } else {
        initializeDateSelectors();
        listenRealTimeVotes();
      }
    } else {
      window.location.href = "index.html";
    }
  }
});

// Tạo tài khoản người dùng mới
// const createUserForm = document.getElementById('create-user-form');
// createUserForm.addEventListener('submit', async (e) => {
//   e.preventDefault();
//   const email = document.getElementById('newUserEmail').value;
//   const password = document.getElementById('newUserPassword').value;

//   try {
//     const result = await createUserByAdmin(email, password);
//     if (result.success) {
//       alert("Tạo tài khoản thành công!");
//       createUserForm.reset();
//       listenRealTimeVotes();
//     } else {
//       alert("Lỗi tạo tài khoản: " + result.error);
//     }
//   } catch (error) {
//     alert("Lỗi tạo tài khoản: " + error.message);
//   }
// });

// Lắng nghe real-time
function listenRealTimeVotes() {
  const weekId = getSelectedWeekId();
  const votesRef = collection(db, 'weeks', weekId, 'votes');
  const q = query(votesRef, orderBy('votedAt', 'asc'));

  onSnapshot(q, snapshot => {
    buildAllInOneTable(snapshot.docs);
  }, err => {
    console.error("Lỗi onSnapshot:", err);
  });
}

// Hàm xây dựng bảng
function buildAllInOneTable(docs) {
  const tableBody = document.querySelector('#allInOneTable tbody');
  tableBody.innerHTML = '';
  tempChanges = {}; // Reset temporary changes

  docs.forEach(doc => {
    const data = doc.data();
    const docId = doc.id;

    const row = document.createElement('tr');

    // Cột User
    const userCell = document.createElement('td');
    userCell.textContent = data.userEmail || "Unknown";
    row.appendChild(userCell);

    let totalAttended = 0;

    dayList.forEach(day => {
      const cell = document.createElement('td');
      const isRegistered = data.days && data.days[day];
      const isAttended = data.attendance && data.attendance[day];

      if (isRegistered) {
        const label = document.createElement('label');
        label.className = 'custom-checkbox';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !!isAttended;
        checkbox.addEventListener('change', () => {
          // Lưu vào tempChanges thay vì cập nhật ngay
          if (!tempChanges[docId]) {
            tempChanges[docId] = {};
          }
          tempChanges[docId][day] = checkbox.checked;
        });

        const checkmark = document.createElement('span');
        checkmark.className = 'checkmark';
        
        label.appendChild(checkbox);
        label.appendChild(checkmark);
        cell.appendChild(label);

        if (isAttended) totalAttended++;
      } else {
        cell.textContent = "–";
      }

      row.appendChild(cell);
    });

    // Cột "Tổng"
    const totalCell = document.createElement('td');
    totalCell.textContent = totalAttended;
    row.appendChild(totalCell);

    // Cột báo cáo
    const reportCell = document.createElement('td');
    const reportLink = document.createElement('a');
    reportLink.href = `report.html?userId=${docId}`;
    reportLink.className = 'report-link';
    reportLink.innerHTML = '<i class="fas fa-chart-line"></i>';
    reportLink.title = 'Xem báo cáo';
    reportCell.appendChild(reportLink);
    row.appendChild(reportCell);

    tableBody.appendChild(row);
  });
}

// Xử lý nút "Lưu thay đổi"
document.getElementById('saveChangesBtn').addEventListener('click', async () => {
  const weekId = getSelectedWeekId();
  
  try {
    // Lưu tất cả thay đổi
    for (const [docId, changes] of Object.entries(tempChanges)) {
      const voteRef = doc(db, 'weeks', weekId, 'votes', docId);
      const updates = {};
      
      for (const [day, value] of Object.entries(changes)) {
        updates[`attendance.${day}`] = value;
        updates[`confirmed.${day}`] = true;
      }
      
      await updateDoc(voteRef, updates);
    }
    
    alert('Đã lưu thay đổi thành công!');
    tempChanges = {}; // Reset sau khi lưu
  } catch (err) {
    console.error("Lỗi khi lưu thay đổi:", err);
    alert('Có lỗi xảy ra khi lưu thay đổi!');
  }
});

// Hàm lấy số tuần từ ngày
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Hàm lấy weekId từ tuần và năm được chọn
function getSelectedWeekId() {
  const week = document.getElementById('weekSelect').value;
  const year = document.getElementById('yearSelect').value;
  return `${year}-W${week.padStart(2, '0')}`;
}

// Xử lý đăng xuất
document.getElementById('logoutBtn').addEventListener('click', async () => {
  const result = await handleLogout();
  if (result.success) {
    window.location.href = 'index.html';
  } else {
    alert("Lỗi đăng xuất: " + result.error);
  }
});
