
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

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
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, doc, setDoc, getDoc, updateDoc, analytics };
