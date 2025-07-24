// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDISV-faBMEpGdiGkoGm1U-OFiN7Wf5LsU",
  authDomain: "universalyoga-66b5b.firebaseapp.com",
  projectId: "universalyoga-66b5b",
  storageBucket: "universalyoga-66b5b.firebasestorage.app",
  messagingSenderId: "894002154689",
  appId: "1:894002154689:web:da7fe3addc69d6acf35840",
  measurementId: "G-QETM3FDCGH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth
const auth = getAuth(app);

export { db, auth };
