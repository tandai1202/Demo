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
        // await setupVoteForm(); // Thêm hàm setup form
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

// Hiển thị lịch bình chọn cá nhân
async function loadMyVotes() {
  const user = auth.currentUser;
  if (!user) return;

  const weekId = getCurrentWeekId();
  console.log(weekId)
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

// Xử lý đăng xuất
document.getElementById('logoutBtn').addEventListener('click', async () => {
  alert("123")
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

// Ánh xạ số ↔ mã ngày và tên hiển thị
const dayMapping = { 1:'mon',2:'tue',3:'wed',4:'thu',5:'fri',6:'sat',7:'sun' };
function getDayName(day) {
  const names = { mon:'Thứ 2',tue:'Thứ 3',wed:'Thứ 4',thu:'Thứ 5',fri:'Thứ 6',sat:'Thứ 7',sun:'Chủ nhật' };
  return names[day] || day;
}

// Ánh xạ tuần tự thứ → số trong tuần (Mon=1…Sun=7)
const dayNumber = { mon:1, tue:2, wed:3, thu:4, fri:5, sat:6, sun:7 };

// Lấy ISO‐week hiện tại như “2025-W19”
function getCurrentWeekId() {
  const now = new Date();
  const day = now.getDay() || 7; // Sun=0→7
  const thursday = new Date(now);
  thursday.setDate(now.getDate() - (day - 4));
  const year = thursday.getFullYear();
  const firstThu = new Date(year,0,1 + ((11 - new Date(year,0,1).getDay()) % 7));
  const weekNum = 1 + Math.floor((thursday - firstThu) / (7*86400000));
  return `${year}-W${weekNum.toString().padStart(2,'0')}`;
}

// Chu kỳ 3 tuần: mod0->[1,4,7], mod1->[3,6], mod2->[2,5]
function computeAllowedDays(weekId, seedWeek='2025-W17') {
  const [,cur]  = weekId.split('-W').map(Number);
  const [,seed] = seedWeek.split('-W').map(Number);
  const d = cur - seed;
  if (d < 0) return [];
  const m = d % 3;
  if (m === 0) return ['mon','thu','sun'];
  if (m === 1) return ['wed','sat'];
  return ['tue','fri'];
}

// Hiển thị tuần và enable/disable checkbox
async function renderVoteForm() {
  const weekId = getCurrentWeekId();
  // document.getElementById('weekDisplay').textContent = weekId;

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
    // reset trước khi load dữ liệu cũ
    cb.checked = false;
  });

  // Load vote đã lưu (nếu có) và check lại
  const user = auth.currentUser;
  const ref = doc(db,'weeks', weekId, 'votes', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const days = snap.data().days; // { mon:true, tue:false, ... }
    for (let [day, val] of Object.entries(days)) {
      const input = document.querySelector(`.checkbox-group input[data-day="${day}"]`);
      if (input && val) input.checked = true;
    }
  }
}

// Lưu vote lên Firestore
async function saveVote(weekId, selectedDays) {
  const u = auth.currentUser; // current logged-in user
  const voteRef = doc(db, 'weeks', weekId, 'votes', u.uid); // bạn đặt tên là ref, nhưng lại dùng voteRef trong setDoc

  const daysObj = {
    mon: false, tue: false, wed: false,
    thu: false, fri: false, sat: false, sun: false
  };

  selectedDays.forEach(d => {
    if (daysObj.hasOwnProperty(d)) daysObj[d] = true;
  });

  try {
    const userDoc = await getDoc(doc(db, 'users', u.uid));
    const userEmail = userDoc.exists() ? userDoc.data().email : "Unknown";

    await setDoc(voteRef, {
      userEmail: userEmail,
      days: daysObj,
      votedAt: serverTimestamp(),
      attendance: { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false },
      confirmed: {
        mon: false, tue: false, wed: false,
        thu: false, fri: false, sat: false, sun: false
      }
    });

    // await setDoc(voteRef, {
    //   userEmail: userEmail,
    //   days: newDaysObj,
    //   votedAt: serverTimestamp(),
    //   attendance: { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false },
    //   confirmed: { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false }
    // });

    document.getElementById('voteStatus').textContent = "Gửi bình chọn thành công!";
    loadMyVotes?.(); // Nếu hàm này tồn tại
  } catch (err) {
    console.error(err);
    document.getElementById('voteStatus').textContent = "Lỗi khi gửi bình chọn!";
  }
}


// Khi submit form
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

    if (selected.length === 0) {
      return alert('Vui lòng chọn ít nhất một ngày!');
    }

    try {
      await saveVote(weekId, selected);
      document.getElementById('voteStatus').textContent = 'Bình chọn đã được lưu!';
    } catch (err) {
      console.error(err);
      alert('Lỗi khi lưu bình chọn.');
    }
  });
}

// Khởi khi auth thay đổi
onAuthStateChanged(auth, async user => {
  if (!user) {
    handleLogout();
  } else {
    // Hiển thị form
    document.getElementById('voteSection').style.display = 'block';
    bindVoteSubmit();
    await renderVoteForm();
  }
});

