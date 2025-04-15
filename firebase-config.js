// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDUlj69mBwnPlEfahBs52dMWShangAXGNk",
  authDomain: "fir-qs-4b074.firebaseapp.com", 
  databaseURL: "https://fir-qs-4b074-default-rtdb.firebaseio.com",
  projectId: "fir-qs-4b074",
  storageBucket: "fir-qs-4b074.firebasestorage.app",
  messagingSenderId: "354412835400",
  appId: "1:354412835400:web:5043359b00be2a12e51e7d",
  measurementId: "G-LENXY1MNNW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };