import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { app } from "./firebase-config.js";
import { handleLogout } from "./auth.js";

// Khởi tạo Firebase
const auth = getAuth(app);
const db = getFirestore(app);

// Mapping ngày trong tuần
const weekDayMapping = {
  'mon': 1,
  'tue': 2,
  'wed': 3,
  'thu': 4,
  'fri': 5,
  'sat': 6,
  'sun': 7
};

const dayMappingReverse = {
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
  7: 'sun'
};

// Kiểm tra role
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'index.html';
  } else {
    const docSnap = await getDoc(doc(db, 'users', user.uid));
    if (docSnap.exists()) {
      const userData = docSnap.data();
      if (userData.role === 'user') {
        document.getElementById('voteSection').style.display = 'block';
        document.getElementById('titleVote').textContent = `Bình chọn ngày đi làm tuần này (${getCurrentWeekId()})`;
        await setupVoteForm(); // Thêm hàm setup form
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

// Hàm lấy bình chọn của tuần trước
async function getPreviousWeekVote() {
  const user = auth.currentUser;
  if (!user) return null;

  const currentWeekId = getCurrentWeekId();
  const [year, week] = currentWeekId.split("-W");
  const previousWeek = parseInt(week) - 1;
  const previousWeekId = previousWeek > 0 ? `${year}-W${previousWeek}` : `${parseInt(year)-1}-W52`;

  const voteDoc = await getDoc(doc(db, 'weeks', previousWeekId, 'votes', user.uid));
  return voteDoc.exists() ? voteDoc.data() : null;
}

// Hàm lấy ngày được phép chọn
async function getAllowedDays() {
  const weekId = getCurrentWeekId();
  const previousVote = await getPreviousWeekVote();
  
  // Tuần đầu tiên
  if (!previousVote) {
    return ['mon', 'thu', 'sun']; // T2, T5, CN
  }

  // Tìm ngày chọn cuối cùng của tuần trước
  let lastSelectedDay = null;
  const days = Object.entries(previousVote.days);
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i][1] === true) {
      lastSelectedDay = days[i][0];
      break;
    }
  }

  if (!lastSelectedDay) return [];

  // Tính toán ngày cho phép của tuần này (cách 4 ngày)
  const lastDayNumber = weekDayMapping[lastSelectedDay];
  const firstAllowedDay = ((lastDayNumber + 4) % 7) || 7;
  const secondAllowedDay = ((firstAllowedDay + 4) % 7) || 7;

  return [dayMappingReverse[firstAllowedDay], dayMappingReverse[secondAllowedDay]];
}

// Setup form bình chọn
async function setupVoteForm() {
  const allowedDays = await getAllowedDays();
  const weekId = getCurrentWeekId();
  const user = auth.currentUser;
  
  // Kiểm tra nếu có bất kỳ ngày nào đã được xác nhận
  if (user) {
    const voteDoc = await getDoc(doc(db, 'weeks', weekId, 'votes', user.uid));
    if (voteDoc.exists() && Object.values(voteDoc.data().confirmed || {}).some(v => v)) {
      // Disable toàn bộ form nếu có bất kỳ ngày nào đã được xác nhận
      document.querySelectorAll('input[name="days"]').forEach(checkbox => {
        checkbox.disabled = true;
        checkbox.closest('.checkbox-label').classList.add('disabled');
      });
      document.getElementById('voteStatus').textContent = "Bình chọn đã có ngày được xác nhận, không thể thay đổi!";
      return;
    }
  }
  
  // Disable tất cả checkbox
  document.querySelectorAll('input[name="days"]').forEach(checkbox => {
    checkbox.disabled = true;
    checkbox.closest('.checkbox-label').classList.remove('disabled');
  });

  // Enable chỉ những ngày được phép
  allowedDays.forEach(day => {
    const checkbox = document.querySelector(`input[value="${day}"]`);
    if (checkbox) {
      checkbox.disabled = false;
      checkbox.closest('.checkbox-label').classList.remove('disabled');
    }
  });
}

// Hiển thị lịch bình chọn cá nhân
async function loadMyVotes() {
  const user = auth.currentUser;
  if (!user) return;

  const weekId = getCurrentWeekId();
  const voteDoc = await getDoc(doc(db, 'weeks', weekId, 'votes', user.uid));

  // Lấy ngày bắt đầu tuần hiện tại và hiển thị
  const startOfWeek = getStartOfWeek(weekId);
  const formattedDate = currentMonday() 
  
  // Hiển thị thông tin tuần hiện tại
  const [year, week] = weekId.split("-W");
  document.getElementById('weekStartDate').textContent = 
    `Tuần ${week} (${year}): Ngày bắt đầu ${formattedDate}`;

  if (voteDoc.exists()) {
    const data = voteDoc.data();
    const days = data.days;
    const attendance = data.attendance;
    const confirmed = data.confirmed || {};

    // Hiển thị lịch bình chọn và cập nhật trạng thái checkbox
    for (const [day, value] of Object.entries(days)) {
      const dayElement = document.getElementById(day);
      const checkbox = document.querySelector(`input[value="${day}"]`);
      
      if (dayElement) {
        // Hiển thị icon khác nhau cho trạng thái khác nhau
        if (confirmed[day]) {
          dayElement.textContent = value ? "✅" : "❌"; // Đã xác nhận
        } else {
          dayElement.textContent = value ? "✔️" : "–"; // Chưa xác nhận
        }
      }

      // Cập nhật trạng thái checkbox
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

    // Hiển thị trạng thái chấm công
    for (const [day, value] of Object.entries(attendance)) { 
      const dayAttendanceElement = document.getElementById(`${day}Attendance`);
      if (dayAttendanceElement) dayAttendanceElement.textContent = value ? "✔️" : "–";
    } 

    // Thêm thông báo về trạng thái xác nhận
    const confirmedDays = Object.entries(confirmed).filter(([_, value]) => value).map(([day]) => day);
    if (confirmedDays.length > 0) {
      document.getElementById('confirmStatus').textContent =
        `Các ngày đã được admin xác nhận: ${confirmedDays.map(day => getDayName(day)).join(', ')}`;
    } else {
      document.getElementById('confirmStatus').textContent = '';
    }
  } else {
    console.log("Chưa có dữ liệu bình chọn và chấm công tuần này.");
  }
}

// Gọi hàm loadMyVotes ngay sau khi đăng nhập thành công
onAuthStateChanged(auth, async (user) => {
  if (user) {
    loadMyVotes();
  }
});

// Xử lý submit form bình chọn
const voteForm = document.getElementById('voteForm');
voteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return alert("Bạn chưa đăng nhập!");

  const weekId = getCurrentWeekId();
  const voteRef = doc(db, 'weeks', weekId, 'votes', user.uid);
  const voteDoc = await getDoc(voteRef);

  // Kiểm tra nếu có bất kỳ ngày nào đã được xác nhận
  if (voteDoc.exists() && Object.values(voteDoc.data().confirmed || {}).some(v => v)) {
    return alert("Bình chọn của tuần này đã có ngày được admin xác nhận, không thể thay đổi!");
  }

  // Kiểm tra khoảng cách giữa các ngày được chọn
  const checkedDays = Array.from(document.querySelectorAll('input[name="days"]:checked'))
    .map(d => ({
      key: d.value,
      number: weekDayMapping[d.value]
    }))
    .sort((a, b) => a.number - b.number);

  if (checkedDays.length > 0) {
    // Kiểm tra khoảng cách 4 ngày
    for (let i = 1; i < checkedDays.length; i++) {
      const diff = checkedDays[i].number - checkedDays[i-1].number;
      if (diff < 3) { 
        const day1 = getDayName(checkedDays[i-1].key);
        const day2 = getDayName(checkedDays[i].key);
        return alert(`${day1} và ${day2} cách nhau chưa đủ 4 ngày!`);
      } 
    }
  }

  const newDaysObj = { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false };
  checkedDays.forEach(day => {
    newDaysObj[day.key] = true;
  });

  // Kiểm tra xem còn ngày nào được chọn không
  if (!Object.values(newDaysObj).some(v => v)) {
    return alert("Vui lòng chọn ít nhất một ngày!");
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userEmail = userDoc.data().email || "Unknown";

    await setDoc(voteRef, {
      userEmail: userEmail,
      days: newDaysObj,
      votedAt: serverTimestamp(),
      attendance: { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false },
      confirmed: { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false }
    });

    document.getElementById('voteStatus').textContent = "Gửi bình chọn thành công!";
    loadMyVotes(); // Cập nhật bảng bình chọn cá nhân
  } catch (err) {
    console.error(err);
    document.getElementById('voteStatus').textContent = "Lỗi khi gửi bình chọn!";
  }
});

// Xử lý đăng xuất
document.getElementById('logoutBtn').addEventListener('click', async () => {
  const result = await handleLogout();
  if (result.success) {
    window.location.href = 'index.html';
  } else {
    alert("Lỗi đăng xuất: " + result.error);
  }
});

function getStartOfWeek(weekId) {
  const [year, week] = weekId.split("-W");
  const firstDayOfYear = new Date(year, 0, 1);
  const firstMonday = firstDayOfYear.getDate() + (1 - firstDayOfYear.getDay() + 7) % 7;
  const startOfWeek = new Date(year, 0, firstMonday + (week - 1) * 7);
  
  return startOfWeek;
}

function getCurrentWeekId() {
  const now = new Date();
  
  // Tính ngày thứ Hai của tuần hiện tại
  const currentMonday = new Date(now);
  const dayOfWeek = now.getDay() || 7; // Chuyển Chủ nhật từ 0 thành 7
  currentMonday.setDate(now.getDate() - dayOfWeek + 1);
  
  // Tính tuần ISO 8601
  // Sử dụng thuật toán: Lấy ngày thứ Năm của tuần hiện tại và đếm số tuần từ ngày thứ Năm đầu tiên của năm
  const thursdayOfCurrentWeek = new Date(now);
  thursdayOfCurrentWeek.setDate(now.getDate() - ((dayOfWeek + 6) % 7) + 4);
  
  // Lấy năm của ngày thứ Năm (đây là năm ISO)
  const year = thursdayOfCurrentWeek.getFullYear();
  
  // Tìm ngày thứ Năm đầu tiên của năm
  const firstDayOfYear = new Date(year, 0, 1);
  const firstThursdayOfYear = new Date(year, 0, 1 + ((11 - firstDayOfYear.getDay()) % 7));
  
  // Tính số tuần
  const weekNumber = 1 + Math.floor((thursdayOfCurrentWeek - firstThursdayOfYear) / (7 * 24 * 60 * 60 * 1000));
  
  // Định dạng số tuần
  const formattedWeek = weekNumber < 10 ? `0${weekNumber}` : weekNumber;
   
  return `${year}-W${formattedWeek}`;
}

function currentMonday() {
  //dd/mm/yyyy
  const now = new Date();

  const currentMonday = new Date(now);
  const dayOfWeek = now.getDay() || 7; // Chuyển Chủ nhật từ 0 thành 7
  currentMonday.setDate(now.getDate() - dayOfWeek + 1);
 
  const dd = String(currentMonday.getDate()).padStart(2, '0');
  const mm = String(currentMonday.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0
  const yyyy = currentMonday.getFullYear();

  const formattedDate = `${dd}/${mm}/${yyyy}`;
  return formattedDate;
}

function getDayName(day) {
  const dayNames = {
    'mon': 'Thứ 2',
    'tue': 'Thứ 3',
    'wed': 'Thứ 4',
    'thu': 'Thứ 5',
    'fri': 'Thứ 6',
    'sat': 'Thứ 7',
    'sun': 'Chủ nhật'
  };
  return dayNames[day] || day;
}
 