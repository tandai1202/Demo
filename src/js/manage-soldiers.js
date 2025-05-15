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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import { app } from "./firebase-config.js";
import { handleLogout } from "./auth.js";

const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
  const soldiersCol = collection(db, 'users');
  const tbody = document.querySelector('.military-table tbody');
  const soldierForm = document.getElementById('soldierForm');
  const soldierModal = document.getElementById('soldierModal');
  const addSoldierBtn = document.getElementById('addSoldierBtn');

  // Hiển thị danh sách người dùng
  onSnapshot(soldiersCol, snapshot => {
    tbody.innerHTML = '';
    let index = 1;
    snapshot.forEach(doc => {
      const data = doc.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index++}</td>
        <td>
          <div class="soldier-info">
            <img src="${data.avatarURL || './image/logo.webp'}" class="soldier-avatar" />
            <span>${data.name}</span>
          </div>
        </td>
        <td>${data.unit}</td>
        <td>${data.email}</td>
        <td>${data.joinDate?.toDate().toLocaleDateString('vi-VN') || ''}</td>
        <td>
          <button class="action-button edit-button" data-id="${doc.id}"><i class="fas fa-edit"></i></button>
          <button class="action-button delete-button" data-id="${doc.id}"><i class="fas fa-trash-alt"></i></button>
          <button class="action-button reset-button" data-id="${doc.id}"><i class="fas fa-key"></i></button>
        </td>`;
      tbody.appendChild(tr);
    });
  });

  // Mở form thêm chiến sĩ
  addSoldierBtn.addEventListener('click', () => {
    document.getElementById('modalTitle').textContent = 'Thêm chiến sĩ mới';
    soldierForm.reset();
    soldierModal.style.display = 'block';
  });

  // Xử lý form submit
  soldierForm.addEventListener('submit', async e => {
    e.preventDefault();

    const name = document.getElementById('soldierName').value;
    const unit = document.getElementById('soldierUnit').value;
    const email = document.getElementById('soldierEmail').value;
    const password = document.getElementById('soldierPassword').value;

    try {
      // Tạo tài khoản trong Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Lưu vào Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name,
        unit,
        email,
        avatarURL: null,
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

  // Modal và các nút đóng
  const closeModal = document.querySelector('.close-modal');
  const cancelButton = document.querySelector('.cancel-button');

  closeModal.addEventListener('click', () => soldierModal.style.display = 'none');
  cancelButton.addEventListener('click', () => soldierModal.style.display = 'none');

  window.addEventListener('click', event => {
    if (event.target === soldierModal) {
      soldierModal.style.display = 'none';
    }
  });

  // Giả lập nút sửa
  document.addEventListener('click', e => {
    if (e.target.closest('.edit-button')) {
      const row = e.target.closest('tr');
      document.getElementById('modalTitle').textContent = 'Chỉnh sửa chiến sĩ';
      document.getElementById('soldierName').value = row.querySelector('.soldier-info span').textContent;
      soldierModal.style.display = 'block';
    }
  });

  // Giả lập nút xóa
  document.addEventListener('click', e => {
    if (e.target.closest('.delete-button')) {
      if (confirm('Bạn có chắc chắn muốn xóa chiến sĩ này?')) {
        const row = e.target.closest('tr');
        row.remove(); // Gỡ khỏi bảng, chưa xóa thật từ Firestore
        alert('Đã xóa chiến sĩ thành công!');
      }
    }
  });

  // Giả lập nút reset mật khẩu
  document.addEventListener('click', e => {
    if (e.target.closest('.reset-button')) {
      if (confirm('Bạn có chắc chắn muốn đặt lại mật khẩu cho chiến sĩ này?')) {
        alert('Đã đặt lại mật khẩu mặc định cho chiến sĩ!');
      }
    }
  });
});
