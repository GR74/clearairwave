import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDfOcpUWJQokO5dDzdGd7j_vVH3uzKAe6c",
  authDomain: "clearairwave-b0061.firebaseapp.com",
  projectId: "clearairwave-b0061",
  storageBucket: "clearairwave-b0061.firebasestorage.app",
  messagingSenderId: "640136962027",
  appId: "1:640136962027:web:1d44a1b46d09dc29d743ae",
  measurementId: "G-7SBS1EBQZ1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };