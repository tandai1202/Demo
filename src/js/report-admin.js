import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { app } from "./firebase-config.js";
import { handleLogout } from "./auth.js";

// Firebase init
const auth = getAuth(app);
const db = getFirestore(app);

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

let currentUserRole = '';
let usersList = [];

// On auth state change
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    const userSnap = await getDoc(doc(db, 'users', user.uid));
    if (!userSnap.exists()) {
        alert("Không tìm thấy thông tin người dùng!");
        window.location.href = 'index.html';
        return;
    }

    const userData = userSnap.data();
    currentUserRole = userData.role;
    // document.getElementById("userName").textContent = `Họ và tên: ${userData.name || 'Chưa có'}`;

    if (currentUserRole === "admin") {
        await loadUsersList();
    } else {
        usersList = [{ id: user.uid, email: userData.email, unit: userData.unit || "Chưa rõ" }];
    }

    initializeDateSelectors();
});

// Load users for admin
async function loadUsersList() {
    const snap = await getDocs(query(collection(db, "users"), where("role", "==", "user")));
    usersList = snap.docs.map(doc => ({
        id: doc.id,
        email: doc.data().email,
        unit: doc.data().unit || "Không rõ"
    }));
}

// Month/year dropdown init
function initializeDateSelectors() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');

    for (let i = 1; i <= 12; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Tháng ${i}`;
        monthSelect.appendChild(option);
    }

    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 2; i <= currentYear; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Năm ${i}`;
        yearSelect.appendChild(option);
    }

    monthSelect.value = new Date().getMonth() + 1;
    yearSelect.value = currentYear;

    monthSelect.addEventListener('change', loadReportData);
    yearSelect.addEventListener('change', loadReportData);

    loadReportData();
}

// Utilities
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
function getDaysInMonth(month, year) {
    const days = [];
    const d = new Date(year, month - 1, 1);
    while (d.getMonth() === month - 1) {
        days.push(new Date(d));
        d.setDate(d.getDate() + 1);
    }
    return days;
}

// Main report logic
async function loadReportData() {
    const month = +document.getElementById("monthSelect").value;
    const year  = +document.getElementById("yearSelect").value;
    const days  = getDaysInMonth(month, year);

    const tbody = document.getElementById("reportTableBody");
    tbody.innerHTML = "";

    let grandTotal = 0;
    let unitStats = {};
    let completionStats = { completed: 0, notCompleted: 0, absent: 0 };

    if (!usersList.length && currentUserRole === "admin")
        await loadUsersList();

    for (const user of usersList) {
        const weeksNeeded = new Set(days.map(d => getWeekNumber(d)));
        const weeksCache = {};

        for (const wk of weeksNeeded) {
            const id = getWeekId(year, wk);
            const snap = await getDoc(doc(db, "weeks", id, "votes", user.id));
            weeksCache[id] = snap.exists() ? snap.data() : null;
        }

        const attended = [];
        days.forEach(d => {
            const weekId = getWeekId(year, getWeekNumber(d));
            const data = weeksCache[weekId];
            const key = weekdayKeys[d.getDay()];
            const attendance = data?.attendance || {};
            const confirmed = data?.confirmed || {};
            if (attendance[key] && confirmed[key]) {
                attended.push(`${d.getDate()}/${month}`);
            }
        });

        const count = attended.length;
        grandTotal += count;

        // --- thống kê theo đơn vị
        const unit = user.unit || "Không rõ";
        if (!unitStats[unit]) unitStats[unit] = 0;
        unitStats[unit] += count;

        // --- thống kê hoàn thành
        if (count >= 5) completionStats.completed++;
        else if (count > 0) completionStats.notCompleted++;
        else completionStats.absent++;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${user.email}</td>
            <td>${unit}</td>
            <td>${attended.length ? attended.join(", ") : "Chưa có ngày nào"}</td>
            <td>${count}</td>
            <td>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min(100, count * 10)}%"></div>
                    <span>${Math.min(100, count * 10)}%</span>
                </div>
            </td>
            <td><span class="badge ${count >= 5 ? 'excellent' : count > 0 ? 'warning' : 'absent'}">${count >= 5 ? 'Hoàn thành' : count > 0 ? 'Chưa đạt' : 'Vắng mặt'}</span></td>
        `;
        tbody.appendChild(tr);
    }

    document.getElementById("totalDaysAll").textContent = grandTotal;
    updateUnitChart(unitStats);
    updateCompletionChart(completionStats);
}

// Update charts
// function updateUnitChart(stats) {
//     const ctx = document.getElementById('attendanceByUnitChart').getContext('2d');
//     if (window.unitChart) window.unitChart.destroy();
//     window.unitChart = new Chart(ctx, {
//         type: 'bar',
//         data: {
//             labels: Object.keys(stats),
//             datasets: [{
//                 label: 'Số ngày trực',
//                 data: Object.values(stats),
//                 backgroundColor: 'rgba(42, 92, 69, 0.7)',
//                 borderColor: 'rgba(42, 92, 69, 1)',
//                 borderWidth: 1
//             }]
//         },
//         options: {
//             responsive: true,
//             maintainAspectRatio: false,
//             scales: {
//                 y: { beginAtZero: true }
//             }
//         }
//     });
// }

// function updateCompletionChart(stats) {
//     const ctx = document.getElementById('completionRateChart').getContext('2d');
//     if (window.rateChart) window.rateChart.destroy();
//     window.rateChart = new Chart(ctx, {
//         type: 'doughnut',
//         data: {
//             labels: ['Hoàn thành', 'Chưa hoàn thành', 'Vắng mặt'],
//             datasets: [{
//                 data: [stats.completed, stats.notCompleted, stats.absent],
//                 backgroundColor: [
//                     'rgba(58, 125, 93, 0.7)',
//                     'rgba(255, 206, 86, 0.7)',
//                     'rgba(209, 0, 0, 0.7)'
//                 ],
//                 borderColor: [
//                     'rgba(58, 125, 93, 1)',
//                     'rgba(255, 206, 86, 1)',
//                     'rgba(209, 0, 0, 1)'
//                 ],
//                 borderWidth: 1
//             }]
//         },
//         options: {
//             responsive: true,
//             maintainAspectRatio: false,
//             plugins: { legend: { position: 'bottom' } }
//         }
//     });
// }

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    const result = await handleLogout();
    if (result.success) {
        window.location.href = 'index.html';
    } else {
        alert("Lỗi đăng xuất: " + result.error);
    }
});
