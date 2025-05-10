// import { app } from "./firebase-config.js";
import { handleLogout } from "./auth.js";

document.getElementById('logoutBtn').addEventListener('click', async () => {
    // alert("!23")
    const result = await handleLogout();
    if (result.success) {
      window.location.href = 'index.html';
    } else {
      alert("Lỗi đăng xuất: " + result.error);
    }
  });