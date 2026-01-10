
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

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

// Initialize Firebase (v8 style)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const app = firebase.app();

// Initialize Services
export const auth = app.auth();
export const db = app.firestore();
export const storage = app.storage();
export const googleProvider = new firebase.auth.GoogleAuthProvider();
export const analytics = null;

// Auth Adapters
export const signInWithPopup = (authInstance: firebase.auth.Auth, provider: firebase.auth.AuthProvider) => authInstance.signInWithPopup(provider);
export const signInWithEmailAndPassword = (authInstance: firebase.auth.Auth, email: string, password: string) => authInstance.signInWithEmailAndPassword(email, password);
export const createUserWithEmailAndPassword = (authInstance: firebase.auth.Auth, email: string, password: string) => authInstance.createUserWithEmailAndPassword(email, password);
export const signOut = (authInstance: firebase.auth.Auth) => authInstance.signOut();
export const onAuthStateChanged = (authInstance: firebase.auth.Auth, observer: (user: firebase.User | null) => void) => authInstance.onAuthStateChanged(observer);
export const updateProfile = (user: firebase.User, profile: { displayName?: string, photoURL?: string }) => user.updateProfile(profile);

// Firestore Adapters
export const doc = (firestoreOrCol: any, path: string, ...segments: string[]) => {
    const fullPath = [path, ...segments].join('/');
    return firestoreOrCol.doc(fullPath);
};

export const collection = (firestoreOrDoc: any, path: string, ...segments: string[]) => {
    const fullPath = [path, ...segments].join('/');
    return firestoreOrDoc.collection(fullPath);
};

export const getDoc = (ref: any) => ref.get();
// AJOUT DE GETDOCS ICI
export const getDocs = (ref: any) => ref.get(); 
export const setDoc = (ref: any, data: any, options?: any) => ref.set(data, options);
export const updateDoc = (ref: any, data: any) => ref.update(data);
export const deleteDoc = (ref: any) => ref.delete();

export const onSnapshot = (ref: any, ...args: any[]) => ref.onSnapshot(...args);

export const writeBatch = (firestore: any) => firestore.batch();
export const serverTimestamp = () => firebase.firestore.FieldValue.serverTimestamp();

// Query Adapter (Simple chaining for where clauses)
export const where = (field: string, op: any, value: any) => (ref: any) => ref.where(field, op, value);
export const query = (ref: any, ...fns: any[]) => fns.reduce((r, f) => f(r), ref);

// Storage Adapters
export const ref = (storageInstance: any, path: string) => storageInstance.ref(path);
export const uploadBytes = (ref: any, data: any) => ref.put(data);
export const getDownloadURL = (ref: any) => ref.getDownloadURL();

// Google Sign In Helper
export const signInWithGoogle = () => auth.signInWithPopup(googleProvider);

// Types
export type User = firebase.User;
