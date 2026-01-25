// firebase.js
import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  inMemoryPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with platform-specific persistence
let auth;

try {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      // Use browser local storage for web client
      auth = initializeAuth(app, {
        persistence: browserLocalPersistence,
      });
    } else {
      // Use in-memory persistence for server-side/build time
      auth = initializeAuth(app, {
        persistence: inMemoryPersistence,
      });
    }
  } else {
    // Lazy load AsyncStorage to avoid issues in Node.js environment
    const AsyncStorage = require("@react-native-async-storage/async-storage")
      .default;
    // Use AsyncStorage for mobile
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
} catch (error) {
  // If auth is already initialized, get the existing instance
  console.log("Firebase Auth initialization error or already initialized:", error.message);
  try {
    auth = getAuth(app);
  } catch (e) {
    console.error("Failed to get existing Auth instance:", e);
  }
}

// Initialize Firebase Messaging for web push notifications
let messaging = null;
if (Platform.OS === "web") {
  // Check if we are in a browser environment before calling isSupported
  if (typeof window !== "undefined") {
    isSupported()
      .then((supported) => {
        if (supported) {
          messaging = getMessaging(app);
        }
      })
      .catch((err) => {
        console.log("Firebase Messaging not supported:", err);
      });
  }
}

export { auth, messaging };
export const db = getFirestore(app);
export const firebaseApp = app;
