// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBRcHElPziOGJd7Q8rCcIluLZ2XnI9j4wE",
  authDomain: "restorant-8e71c.firebaseapp.com",
  projectId: "restorant-8e71c",
  storageBucket: "restorant-8e71c.firebasestorage.app",
  messagingSenderId: "149835762840",
  appId: "1:149835762840:web:f8f053d46011bc693a94ed",
  measurementId: "G-EHBJM150B0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
