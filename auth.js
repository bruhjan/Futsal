// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// This file needs its own firebase config to function independently
const firebaseConfig = {
  apiKey: "AIzaSyC9yJP_GNIJtoRhQIlptMT_xIhNft47Gmk",
  authDomain: "futsal-b5b4f.firebaseapp.com",
  projectId: "futsal-b5b4f",
  storageBucket: "futsal-b5b4f.firebasestorage.app",
  messagingSenderId: "94907288119",
  appId: "1:94907288119:web:844b0c6d8d30c38c070db2",
  measurementId: "G-2QY9DD64TQ",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const guestBtn = document.getElementById("guestBtn");

  loginBtn.addEventListener("click", handleAdminLogin);
  guestBtn.addEventListener("click", handleGuestLogin);
});

async function handleAdminLogin() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const loginError = document.getElementById("loginError");

  // We use a fixed email for the admin user as created in Firebase Auth
  const email = "rajan.r26@fms.edu";

  if (username !== "SportSoc") {
    loginError.textContent = "Invalid username.";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // On successful login, redirect to the main app
    window.location.href = "app.html";
  } catch (error) {
    console.error("Login failed:", error);
    loginError.textContent = "Login failed. Please check your password.";
  }
}

function handleGuestLogin() {
  // For guests, we just redirect them. The main app will handle their permissions.
  window.location.href = "app.html";
}
