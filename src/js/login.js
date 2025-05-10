// src/js/login.js
import { handleLogin } from "./auth.js";

const loginForm = document.getElementById('login-form');
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const result = await handleLogin(email, password);
  if (result.success) {
    if (result.role === 'admin') {
      window.location.href = 'dashboard-admin.html';
    } else {
      window.location.href = 'user.html';
    }
  } else {
    showError("Đăng nhập thất bại: " + result.error);
  }
});

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  document.querySelector('.login-card').appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 3000);
}

