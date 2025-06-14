// src/js/manage-soldiers.js
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  serverTimestamp,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-functions.js";

import { app } from "./firebase-config.js";
import { handleLogout } from "./auth.js";

const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// DOM elements
const tbody = document.querySelector('.military-table tbody');
const soldierForm = document.getElementById('soldierForm');
const soldierModal = document.getElementById('soldierModal');
const addSoldierBtn = document.getElementById('addSoldierBtn');
const nameInput = document.getElementById('soldierName');
const emailInput = document.getElementById('soldierEmail');

const soldiersCol = collection(db, 'users');

// ===== Helper Functions ===== //
function removeVietnameseTones(str) {
  return str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\x00-\x7F]/g, "");
}

async function generateUniqueEmail(fullName) {
  const cleanName = removeVietnameseTones(fullName.trim().toLowerCase());
  const parts = cleanName.split(/\s+/);
  if (parts.length < 2) return null;
  const lastName = parts[parts.length - 1];
  const initials = parts.slice(0, -1).map(word => word[0]).join('');
  let baseEmail = `${lastName}${initials}`;
  let email = `${baseEmail}@gmail.com`;
  let count = 0;

  while (true) {
    const q = query(soldiersCol, where("email", "==", email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) break;
    count++;
    email = `${baseEmail}${count}@gmail.com`;
  }

  return email;
}

function renderUserRow(docData, index, docId) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${index}</td>
    <td><div class="soldier-info">
      <img src="${docData.avatarURL || './image/logo.webp'}" class="soldier-avatar" />
      <span>${docData.name}</span>
    </div></td>
    <td>${docData.unit}</td>
    <td>${docData.email}</td>
    <td>${docData.password || ''}</td>
    <td>${docData.phone || 'Chưa có'}</td>
    <td>${docData.job || 'Chưa có'}</td>
    <td>${docData.joinDate?.toDate().toLocaleDateString('vi-VN') || 'Chưa có'}</td>
    <td>
      <button class="action-button edit-button" data-id="${docId}"><i class="fas fa-edit"></i></button>
      <button class="action-button delete-button" data-id="${docId}"><i class="fas fa-trash-alt"></i></button>
      <button class="action-button reset-button" data-id="${docId}"><i class="fas fa-key"></i></button>
    </td>`;
  return tr;
}

function renderUserList(snapshot) {
  tbody.innerHTML = '';
  let index = 1;
  snapshot.forEach(doc => {
    const tr = renderUserRow(doc.data(), index++, doc.id);
    tbody.appendChild(tr);
  });
}

async function fetchAndRenderUsers() {
  const snapshot = await getDocs(soldiersCol);
  renderUserList(snapshot);
}

// ===== Event Handlers ===== //
nameInput.addEventListener('blur', async () => {
  const name = nameInput.value.trim();
  if (name) {
    const email = await generateUniqueEmail(name);
    emailInput.value = email;
  }
});

addSoldierBtn.addEventListener('click', () => {
  document.getElementById('modalTitle').textContent = 'Thêm chiến sĩ mới';
  soldierForm.reset();
  soldierModal.style.display = 'block';
});

soldierForm.addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('soldierName').value.trim();
  const unit = document.getElementById('soldierUnit').value;
  const password = document.getElementById('soldierPassword').value;
  const phone = document.getElementById('soldierPhone').value;
  const job = document.getElementById('soldierJob').value;
  let email = document.getElementById('soldierEmail').value.trim();

  if (!email) {
    email = await generateUniqueEmail(name);
    document.getElementById('soldierEmail').value = email;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, 'users', user.uid), {
      name,
      unit,
      email,
      avatarURL: null,
      password,
      phone,
      job,
      role: "user",
      joinDate: serverTimestamp()
    });

    alert('Đã thêm chiến sĩ thành công!');
    soldierModal.style.display = 'none';
  } catch (err) {
    console.error(err);
    alert('Lỗi khi tạo tài khoản: ' + err.message);
  }
});

// ===== Modal Actions ===== //
document.querySelector('.close-modal').addEventListener('click', () => soldierModal.style.display = 'none');
document.querySelector('.cancel-button').addEventListener('click', () => soldierModal.style.display = 'none');
window.addEventListener('click', event => {
  if (event.target === soldierModal) {
    soldierModal.style.display = 'none';
  }
});

// ===== Row Button Actions ===== //
document.addEventListener('click', async e => {
  if (e.target.closest('.edit-button')) {
    const row = e.target.closest('tr');
    document.getElementById('modalTitle').textContent = 'Chỉnh sửa chiến sĩ';
    document.getElementById('soldierName').value = row.querySelector('.soldier-info span').textContent;
    soldierModal.style.display = 'block';
  }

  if (e.target.closest('.delete-button')) {
    const id = e.target.closest('.delete-button').dataset.id;
    if (confirm('Bạn có chắc chắn muốn xóa chiến sĩ này?')) {
      try {
        const deleteUserById = httpsCallable(functions, "deleteUserById");
        await deleteUserById({ uid: id });
        alert('Đã xóa chiến sĩ khỏi hệ thống!');
      } catch (error) {
        console.error('Lỗi khi xóa chiến sĩ:', error);
        alert('Không thể xóa chiến sĩ. Vui lòng thử lại.');
      }
    }
  }

  if (e.target.closest('.reset-button')) {
    if (confirm('Bạn có chắc chắn muốn đặt lại mật khẩu cho chiến sĩ này?')) {
      alert('Đã đặt lại mật khẩu mặc định cho chiến sĩ!');
    }
  }
});

// ===== Real-time Rendering ===== //
onSnapshot(soldiersCol, renderUserList);
