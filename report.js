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
let selectedUserId = '';
let selectedUserEmail = '';

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

    // Xử lý giao diện theo role
    if (userData.role === 'admin') {
        document.getElementById('adminFilters').style.display = 'block';
        await loadUsersList();
        document.getElementById('backBtn').href = 'admin.html';
    } else if (userData.role === 'user') {
        selectedUserId = user.uid;
        selectedUserEmail = userData.email;
        document.getElementById('userInfo').textContent = `Người dùng: ${userData.email}`;
        document.getElementById('backBtn').href = 'user.html';
    } else {
        alert("Role không hợp lệ!");
        window.location.href = 'index.html';
        return;
    }

    // Khởi tạo các selector
    initializeDateSelectors();
    
    // Lấy userId từ URL nếu có
    const urlParams = new URLSearchParams(window.location.search);
    const userIdFromUrl = urlParams.get('userId');
    if (userIdFromUrl && currentUserRole === 'admin') {
        selectedUserId = userIdFromUrl;
        const userDoc = await getDoc(doc(db, 'users', userIdFromUrl));
        if (userDoc.exists()) {
            selectedUserEmail = userDoc.data().email;
            document.getElementById('userSelect').value = userIdFromUrl;
            document.getElementById('userInfo').textContent = `Người dùng: ${selectedUserEmail}`;
            loadReportData();
            
        }
    }
});

// Khởi tạo danh sách user cho admin
async function loadUsersList() {
    const userSelect = document.getElementById('userSelect');
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'user'));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((doc) => {
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = doc.data().email;
        userSelect.appendChild(option);
    });

    userSelect.addEventListener('change', (e) => {
        selectedUserId = e.target.value;
        selectedUserEmail = e.target.selectedOptions[0].textContent;
        loadReportData();
    });
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

// Load và hiển thị dữ liệu báo cáo
async function loadReportData() {
    if (!selectedUserId) return;

    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    const weeks = getWeeksInMonth(month, year);
    document.getElementById('userInfo').textContent = `Người dùng: ${selectedUserEmail}`;

    const tableBody = document.getElementById('reportTableBody');
    tableBody.innerHTML = '';

    for (const weekNum of weeks) {
        const weekId = getWeekId(year, weekNum);
        const voteDoc = await getDoc(doc(db, 'weeks', weekId, 'votes', selectedUserId));
        
        if (voteDoc.exists()) {
            const data = voteDoc.data();
            const row = document.createElement('tr');
            
            // Cột tuần
            const weekCell = document.createElement('td');
            weekCell.textContent = `Tuần ${weekNum}`;
            row.appendChild(weekCell);

            // Các cột ngày trong tuần
            ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach(day => {
                const cell = document.createElement('td');
                if (data.days[day]) {
                    if (data.confirmed[day]) {
                        cell.innerHTML = data.attendance[day] ? 
                            '<span class="confirmed">✔</span>' : 
                            '<span class="unconfirmed">✘</span>';
                    } else {
                        cell.innerHTML = '<span class="unconfirmed">⋯</span>';
                    }
                    cell.title = `${weekDayMapping[day]} - ${data.confirmed[day] ? 'Đã xác nhận' : 'Chưa xác nhận'}`;
                } else {
                    cell.textContent = '–';
                }
                row.appendChild(cell);
            });

            tableBody.appendChild(row);
        }
    }
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
    window.location.href = e.target.getAttribute('href');
});