// ============================================
// FIREBASE REALTIME DATABASE CONFIGURATION
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get, update, remove, push, query, orderByChild, equalTo, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ===== GANTI DENGAN KONFIGURASI ANDA =====
const firebaseConfig = {
  apiKey: "AIzaSyAlKa4OKgxQJMrd7yl9X8cvmuUa_2M-wnU",
  authDomain: "portalwebnh-27f3c.firebaseapp.com",
  projectId: "portalwebnh-27f3c",
  storageBucket: "portalwebnh-27f3c.firebasestorage.app",
  messagingSenderId: "628158486315",
  appId: "1:628158486315:web:88be6fbd9e20c794de176e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app); // ← REALTIME DATABASE

// Export
export { 
  auth, 
  db,
  ref,
  set,
  get,
  update,
  remove,
  push,
  query,
  orderByChild,
  equalTo,
  child,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
};
