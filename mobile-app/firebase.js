// firebase.js
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyA4HkXUN_F7bqWYq2lJtCD-6wVZEsKufxM",
  authDomain: "pu-blood-connect.firebaseapp.com",
  projectId: "pu-blood-connect",
  storageBucket: "pu-blood-connect.firebasestorage.app",
  messagingSenderId: "258932183877",
  appId: "1:258932183877:web:e33124b19311692c25e42c"
};

const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with persistence
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // If auth is already initialized, get the existing instance
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
export const firebaseApp = app;
