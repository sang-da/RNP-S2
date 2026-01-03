// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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