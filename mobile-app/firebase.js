// firebase.ts
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


const firebaseConfig = {
  apiKey: "AIzaSyA4HkXUN_F7bqWYq2lJtCD-6wVZEsKufxM",
  authDomain: "pu-blood-connect.firebaseapp.com",
  projectId: "pu-blood-connect",
  storageBucket: "pu-blood-connect.firebasestorage.app",
  messagingSenderId: "258932183877",
  appId: "1:258932183877:web:e33124b19311692c25e42c"
};

const app = initializeApp(firebaseConfig);

// 👇 2. INITIALIZE AUTH WITH PERSISTENCE
// This is the new, correct way to initialize auth for React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// The rest of your exports are correct
export const db = getFirestore(app);
export const storage = getStorage(app);
export const firebaseApp = app;
