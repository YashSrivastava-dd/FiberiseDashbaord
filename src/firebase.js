// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCWSynqzZ4UebJzpGz8WbgroEpHxD6DsBc",
  authDomain: "fitx-2154d.firebaseapp.com",
  projectId: "fitx-2154d",
  storageBucket: "fitx-2154d.firebasestorage.app",
  messagingSenderId: "183183889944",
  appId: "1:183183889944:web:8550bc4c96aed3a16a156d",
  measurementId: "G-NS4YTSS08Z"
};

// Initialize Firebase (prevent multiple initializations in Next.js)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase services safely for Next.js Server-Side Pre-rendering
/** @type {import('firebase/firestore').Firestore} */
let db;
/** @type {import('firebase/auth').Auth} */
let auth;
/** @type {import('firebase/storage').FirebaseStorage} */
let storage;
let analytics = null;

if (typeof window !== "undefined") {
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);

  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, db, auth, storage, analytics };

