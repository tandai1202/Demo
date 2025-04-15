// main.js
// (Đảm bảo đã import firebase scripts trong html)

const firebaseConfig = {
  apiKey: "AIzaSyDUlj69mBwnPlEfahBs52dMWShangAXGNk",
  authDomain: "fir-qs-4b074.firebaseapp.com",
  projectId: "fir-qs-4b074",
  storageBucket: "fir-qs-4b074.firebasestorage.app",
  messagingSenderId: "354412835400",
  appId: "1:354412835400:web:5043359b00be2a12e51e7d",
  measurementId: "G-LENXY1MNNW"
};
  
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = firebase.auth();

// Initialize Cloud Firestore and get a reference to the service
const db = firebase.firestore();

// Initialize Cloud Storage and get a reference to the service
const storage = firebase.storage();