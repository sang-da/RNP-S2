
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile,
  User 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  writeBatch, 
  deleteDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "firebase/storage";

// Configuration officielle RNP1001
const firebaseConfig = {
  apiKey: "AIzaSyCMRGDpT34UvMMVxFKlKb-inQD_5gsBkNc",
  authDomain: "rnp1001.firebaseapp.com",
  projectId: "rnp1001",
  storageBucket: "rnp1001.firebasestorage.app",
  messagingSenderId: "865789124052",
  appId: "1:865789124052:web:124d72ce3c656ba9384a41",
  measurementId: "G-QSVQW2K3CX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const analytics = null;

// Helper for Google Sign In
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

// Re-export Auth functions
export { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile 
};

// Re-export Firestore functions
export { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  writeBatch, 
  deleteDoc, 
  serverTimestamp 
};

// Re-export Storage functions
export { 
  ref, 
  uploadBytes, 
  getDownloadURL 
};

// Export Types
export type { User };
