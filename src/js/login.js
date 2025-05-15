import { handleLogin } from "./auth.js";
import { query } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const result = await handleLogin(email, password);
    console.log(result)
    if (result.success) {
      if (result.role === 'admin') {
        window.location.href = 'dashboard-admin.html';
      } else if (result.role === 'user') {
        window.location.href = 'user.html';
      } else {
        showError("Không xác định được vai trò người dùng.");
      }
    } else {
      showError("Đăng nhập thất bại: " + result.error);
    }
  });
});

function showError(message) {
  const existing = document.querySelector('.error-message');
  if (existing) existing.remove();
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  document.querySelector('.login-card').appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 3000);
} 
