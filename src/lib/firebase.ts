import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCA2sYtEdVPll90DNvuNFOYCYdcQAjcCyk",
  authDomain: "jury-f8b6a.firebaseapp.com",
  projectId: "jury-f8b6a",
  storageBucket: "jury-f8b6a.firebasestorage.app",
  messagingSenderId: "647105508352",
  appId: "1:647105508352:web:bbd7c62c9662867fa594e5",
  measurementId: "G-X0NKWW0QWL"
};

// Initialize Firebase only once to avoid errors during Next.js hot-reloading
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

let analytics;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, auth, analytics };
