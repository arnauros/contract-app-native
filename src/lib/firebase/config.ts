import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAGsX271CpZB1V4mMpCjE2R4QUfuIGwLuQ",
  authDomain: "freelance-project-3d0b5.firebaseapp.com",
  projectId: "freelance-project-3d0b5",
  storageBucket: "freelance-project-3d0b5.firebasestorage.app",
  messagingSenderId: "77895574827",
  appId: "1:77895574827:web:01d90c400022c4b6e0dca6",
  measurementId: "G-V595VGP5DM",
};

// Initialize Firebase
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
