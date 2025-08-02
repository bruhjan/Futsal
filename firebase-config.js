// firebase-config.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC9yJP_GNIJtoRhQIlptMT_xIhNft47Gmk",
  authDomain: "futsal-b5b4f.firebaseapp.com",
  projectId: "futsal-b5b4f",
  storageBucket: "futsal-b5b4f.firebasestorage.app",
  messagingSenderId: "94907288119",
  appId: "1:94907288119:web:844b0c6d8d30c38c070db2",
  measurementId: "G-2QY9DD64TQ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the Firestore database instance so it can be used in other files
export const db = getFirestore(app);
