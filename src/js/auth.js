import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { app } from "./firebase-config.js";

// Khởi tạo Auth và Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// Xử lý đăng nhập
export async function handleLogin(email, password) {
  // 1. Thử đăng nhập qua Firebase Authentication (admin)
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    // Nếu signIn thành công, coi là admin
    return { success: true, role: 'admin', uid: userCred.user.uid };
  } catch (authError) {
    // 2. Nếu không phải admin, thử kiểm tra user trong Firestore
    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('email', '==', email),
        where('password', '==', password)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        // Có bản ghi trùng khớp → coi là user
        const doc = snapshot.docs[0];
        return { success: true, role: 'user', uid: doc.id };
      } else {
        return { success: false, error: 'Email hoặc mật khẩu không đúng.' };
      }
    } catch (fsError) {
      return { success: false, error: fsError.message };
    }
  }
}

// Xử lý đăng ký
export async function handleSignup(email, password) {
  try {
    // Tạo user trên Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Lưu thông tin user + role vào Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: email,
      role: 'user'
    });

    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Xử lý đăng xuất
export async function handleLogout() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Tạo user bởi admin
export async function createUserByAdmin(email, password) {
  try {
    // Tạo user trên Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Lưu thông tin user + role vào Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: email,
      role: 'user'
    });

    return {
      success: true,
      uid: user.uid
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Lấy danh sách users
export async function getAllUsers() {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return {
      success: true,
      users
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}