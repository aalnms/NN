import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// import { getAnalytics } from "firebase/analytics"; // Analytics is optional

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCVExjNfJ-lHnDQMaxYOEa0KRHWcV41HLg",
  authDomain: "brightai-app-counters.firebaseapp.com",
  projectId: "brightai-app-counters",
  storageBucket: "brightai-app-counters.firebasestorage.app", // Corrected bucket name if needed
  messagingSenderId: "947252354071",
  appId: "1:947252354071:web:a344e8104830e421429052",
  measurementId: "G-095KMXP35X" // Optional
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp(); // If already initialized, use that instance
}

// Initialize Firestore
const db = getFirestore(app);

// Initialize Analytics (optional)
// const analytics = getAnalytics(app);

export { db }; // Export the Firestore instance
