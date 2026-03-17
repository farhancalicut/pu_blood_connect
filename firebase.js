// firebase.js
import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  inMemoryPersistence,
} from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
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

// Initialize Firestore
const db = getFirestore(app);

// Enable offline persistence for web
if (Platform.OS === "web" && typeof window !== "undefined") {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn("Firestore persistence failed: Multiple tabs open");
      // Fall back to single tab persistence
      enableIndexedDbPersistence(db).catch((error) => {
        console.warn("Firestore persistence error:", error.message);
      });
    } else if (err.code === "unimplemented") {
      // Browser doesn't support IndexedDB
      console.warn("Firestore persistence not supported in this browser");
    } else {
      console.warn("Firestore persistence error:", err.message);
    }
  });
}

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

export { auth, messaging, db };
export const firebaseApp = app;
