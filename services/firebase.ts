import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your project's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCEOJUNBuqxz9DeFR-gsVc55NkOLR1RiaI",
  authDomain: "eduspark-f0913.firebaseapp.com",
  projectId: "eduspark-f0913",
  storageBucket: "eduspark-f0913.appspot.com",
  messagingSenderId: "167952739747",
  appId: "1:167952739747:web:f6e9e1e243ae36e8d93e16",
  measurementId: "G-Q2VDS2CBQ2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the necessary Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
