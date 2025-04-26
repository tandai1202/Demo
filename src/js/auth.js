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
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Lấy role trong Firestore
    const docSnap = await getDoc(doc(db, 'users', user.uid));
    if (!docSnap.exists()) {
      throw new Error("Tài khoản chưa được thiết lập thông tin trong Firestore!");
    }

    const userData = docSnap.data();
    return {
      success: true,
      role: userData.role
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
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