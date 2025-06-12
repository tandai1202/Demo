import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { app } from "./firebase-config.js";
import { handleLogout } from "./auth.js";

// Khởi tạo Firebase
const auth = getAuth(app);
const db = getFirestore(app);

// Mapping các ngày trong tuần
const weekdayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const weekDayMapping = {
    'mon': 'Thứ 2',
    'tue': 'Thứ 3',
    'wed': 'Thứ 4',
    'thu': 'Thứ 5',
    'fri': 'Thứ 6',
    'sat': 'Thứ 7',
    'sun': 'Chủ nhật'
};

// Khởi tạo các biến global
let currentUserRole = '';
var usersList = []; 


// Kiểm tra quyền truy cập và khởi tạo giao diện
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    const docSnap = await getDoc(doc(db, 'users', user.uid));
    if (!docSnap.exists()) {
        alert("Không tìm thấy thông tin người dùng!");
        window.location.href = 'index.html';
        return;
    }

    const userData = docSnap.data();
    currentUserRole = userData.role;
    // console.log(userData)
    // ✅ Thêm dòng này để hiển thị họ tên
    document.getElementById("userName").textContent = `Họ và tên: ${userData.name || 'Chưa có'}`;

    // Xử lý giao diện theo role
    if (currentUserRole === "admin") {
        await loadUsersList();
        document.getElementById("backBtn").href = "admin.html";
    } else {
        usersList = [{ id: user.uid, name: userData.name }];
        document.getElementById("backBtn").href = "user.html";
    }

    // Khởi tạo các selector
    initializeDateSelectors();
});

async function loadUsersList() {
    const snap = await getDocs(query(collection(db, "users"), where("role", "==", "user")));
    usersList = snap.docs.map((d) => ({ id: d.id, name: d.data().name }));
}

// Khởi tạo các selector ngày tháng
function initializeDateSelectors() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');

    // Tạo options cho tháng (1-12)
    for (let i = 1; i <= 12; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Tháng ${i}`;
        monthSelect.appendChild(option);
    }

    // Tạo options cho năm (năm hiện tại và 2 năm trước)
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 2; i <= currentYear; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Năm ${i}`;
        yearSelect.appendChild(option);
    }

    // Set giá trị mặc định là tháng và năm hiện tại
    monthSelect.value = new Date().getMonth() + 1;
    yearSelect.value = currentYear;

    // Thêm event listeners
    monthSelect.addEventListener('change', loadReportData);
    yearSelect.addEventListener('change', loadReportData);

    // Load dữ liệu lần đầu
    loadReportData();
}

// Tính weekId từ năm và số tuần
function getWeekId(year, week) {
    return `${year}-W${week.toString().padStart(2, '0')}`;
}

// Lấy số tuần từ ngày
function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// Lấy danh sách các tuần trong tháng
function getWeeksInMonth(month, year) {
    const weeks = new Set();
    const date = new Date(year, month - 1, 1);
    
    while (date.getMonth() === month - 1) {
        weeks.add(getWeekNumber(date));
        date.setDate(date.getDate() + 1);
    }
    
    return Array.from(weeks).sort((a, b) => a - b);
}

function getDaysInMonth(month, year) {
    const out = [];
    const d = new Date(year, month - 1, 1);
    while (d.getMonth() === month - 1) {
        out.push(new Date(d));
        d.setDate(d.getDate() + 1);
    }
    return out;
}

async function loadReportData() {
    const month = +document.getElementById("monthSelect").value;
    const year  = +document.getElementById("yearSelect").value;
    const days  = getDaysInMonth(month, year);
  
    // header cột đã có sẵn trong HTML
    const tbody = document.getElementById("reportTableBody");
    tbody.innerHTML = "";
  
    let grandTotal = 0;
  
    if (!usersList.length && currentUserRole === "admin") 
      await loadUsersList();
  
    for (const user of usersList) {
        console.log(usersList)
      // --- fetch tuần vào cache như trước ---
      const weeksNeeded = new Set(days.map(d => getWeekNumber(d)));
      const weeksCache  = {};
      for (const wk of weeksNeeded) {
        const id   = getWeekId(year, wk);
        const snap = await getDoc(doc(db, "weeks", id, "votes", user.id));
        weeksCache[id] = snap.exists() ? snap.data() : null;
      }
  
      // --- gom ngày đã đi tuần và confirmed ---
      const attended = [];
      days.forEach(d => {
        const weekId = getWeekId(year, getWeekNumber(d));
        const data   = weeksCache[weekId];
        const key    = weekdayKeys[d.getDay()];
      
        // safe extraction
        const attendance = data?.attendance || {};
        const confirmed  = data?.confirmed  || {};
      
        if (attendance[key] && confirmed[key]) {
          attended.push(`${d.getDate()}/${month}`);
        }
      });
      
  
      // --- đếm và cộng vào tổng chung ---
      const count = attended.length;
      grandTotal += count;
  
      // --- tạo row ---
      const tr      = document.createElement("tr");
      const tdName = document.createElement("td");
      const tdDays  = document.createElement("td");
      const tdCount = document.createElement("td");
  
      tdName.textContent = user.name;
      tdDays.textContent  = attended.length
        ? attended.join(", ")
        : "Chưa có ngày nào";
      tdCount.textContent = count;
  
      tr.append(tdName, tdDays, tdCount);
      tbody.appendChild(tr);
    }
  
    // ghi tổng chung vào footer
    document.getElementById("totalDaysAll").textContent = grandTotal;
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

// Xử lý nút quay lại
document.getElementById('backBtn').addEventListener('click', (e) => {
    e.preventDefault();
    window.history.back();
});

// const backBtn = document.getElementById('backBtn');
//     backBtn.addEventListener('click', function() {
//       // 1) Nếu muốn quay về trang trước đó trong lịch sử trình duyệt:
//       window.history.back();

//       // 2) Nếu bạn muốn luôn chuyển về đúng trang user (ví dụ '/user'):
//       // window.location.href = '/user';
//     });