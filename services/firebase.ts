
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

// Initialize Firebase using compat to ensure Auth availability
const app = firebase.initializeApp(firebaseConfig);

// Initialize Analytics safely
const analytics = null;

// Auth Exports (v8 compat wrapped as v9 style)
export const auth = app.auth();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

export const signInWithPopup = (authInstance: any, provider: any) => authInstance.signInWithPopup(provider);
export const signInWithEmailAndPassword = (authInstance: any, email: string, pass: string) => authInstance.signInWithEmailAndPassword(email, pass);
export const createUserWithEmailAndPassword = (authInstance: any, email: string, pass: string) => authInstance.createUserWithEmailAndPassword(email, pass);
export const signOut = (authInstance: any) => authInstance.signOut();
export const onAuthStateChanged = (authInstance: any, observer: any) => authInstance.onAuthStateChanged(observer);
export const updateProfile = (user: any, profile: any) => user.updateProfile(profile);

export type User = firebase.User;

// Firestore & Storage (v9 modular style)
export const db = getFirestore(app);
export const storage = getStorage(app);

export { doc, setDoc, getDoc, updateDoc, analytics };
