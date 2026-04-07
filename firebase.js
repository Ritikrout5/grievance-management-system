
  {/* // Import Firebase */}
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
  import { getAuth } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

  {/* // Your config (keep same) */}
  const firebaseConfig = {
    apiKey: "AIzaSyBGFi56CTbSNtacHUCYJFT_uWYEflk0x5g",
    authDomain: "grievance-system-9dfbb.firebaseapp.com",
    projectId: "grievance-system-9dfbb",
    storageBucket: "grievance-system-9dfbb.firebasestorage.app",
    messagingSenderId: "847369692423",
    appId: "1:847369692423:web:c02858106dce3514a291a2",
    measurementId: "G-KHDG56LM2S"
  };

  {/* // Initialize */}
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);

  {/* // ✅ ADD THIS (IMPORTANT) */}
  const db = getFirestore(app);
  const auth = getAuth(app);

  {/* // ✅ MAKE GLOBAL (so app.js can use it) */}
  window.db = db;
  window.auth = auth;

  console.log("Firebase Connected ✅");