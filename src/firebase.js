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

// Initialize Firebase services
// Initialize Firestore - Firebase SDK automatically detects the region (nam5)
// If you have a specific database ID (not default), specify it as second parameter
// Example: getFirestore(app, 'your-database-id')
const db = getFirestore(app);

const auth = getAuth(app);
const storage = getStorage(app);

// Initialize Analytics (only in browser environment)
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, db, auth, storage, analytics };

