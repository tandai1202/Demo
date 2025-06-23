# 📅 Lịch Bình Chọn Tuần

Ứng dụng web cho phép người dùng bình chọn ngày đi làm trong tuần, ghi chú lý do, và xem lịch bình chọn của tất cả mọi người. Phù hợp cho đội nhóm cần phân ca hoặc đăng ký lịch trực hàng tuần.

## 🚀 Chức năng chính

- 👤 **Đăng nhập/Đăng xuất** (tích hợp Firebase Authentication)
- ✅ **Bình chọn ngày làm việc trong tuần**
- 📝 **Ghi chú lý do nếu không chọn ngày nào**
- 📊 **Xem lịch bình chọn của tất cả thành viên**
- ✅ **Admin có thể chấm công và xác nhận**
- 🔁 **Hệ thống luân phiên 3 tuần theo chu kỳ (tự động tính allowed days)**

---

## 🏗️ Cấu trúc thư mục

```
project-root/
├── index.html # Trang chính
├── src/
│ ├── js/
│ │ ├── user.js # Logic người dùng (vote, load data)
│ │ └── firebase-config.js # Cấu hình Firebase
│ ├── css/
│ │ └── user.css # Giao diện người dùng
├── README.md # File hướng dẫn (bạn đang đọc)
```

---

## 🔧 Cài đặt & sử dụng

### 1. Cài đặt Firebase cho project:
- Vào [https://console.firebase.google.com](https://console.firebase.google.com)
- Tạo project mới > Thêm Web App > Lấy đoạn cấu hình (`apiKey`, `projectId`, `appId`, ...)

Tạo file `firebase-config.js`:

```js
// src/js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";

const firebaseConfig = {
  apiKey: "API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

export const app = initializeApp(firebaseConfig);
```

---

### 2. Chạy project
- Mở file `index.html` bằng trình duyệt (hoặc triển khai trên Firebase Hosting / Vercel / Netlify).
- Đăng nhập bằng tài khoản đã có trong Firestore.
- Thực hiện bình chọn lịch và xem bảng bình chọn của cả nhóm.

---

## 📌 Ghi chú

- Người dùng **chỉ có thể chọn** các ngày được phép theo tuần (`computeAllowedDays()`).
- Lịch được chia theo tuần ISO dạng `YYYY-Www` và tính ngày đầu tuần (thứ Hai) tự động.
- Giao diện chia làm 3 phần: **Header – Main – Footer**.
- Giao diện đã được tối ưu **responsive**: chạy tốt trên máy tính và điện thoại.
- Dữ liệu lưu trữ tại **Firebase Firestore**, không cần backend riêng.

---

## 🧰 Công nghệ sử dụng

- 🔥 **Firebase** (Authentication + Firestore)
- 💻 **HTML5 / CSS3 / JavaScript (ES Module)**
- 🎨 **Giao diện hiện đại, hiệu ứng đẹp, dễ dùng**
- 📦 **Triển khai đơn giản – không cần backend**

---

## 📞 Liên hệ

> Phát triển bởi Hoàng Tân Đại  - 0987010358