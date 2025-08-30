// firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA4HkXUN_F7bqWYq2lJtCD-6wVZEsKufxM",
  authDomain: "pu-blood-connect.firebaseapp.com",
  projectId: "pu-blood-connect",
  storageBucket: "pu-blood-connect.firebasestorage.app",
  messagingSenderId: "258932183877",
  appId: "1:258932183877:web:e33124b19311692c25e42c"
};

const firebaseApp = initializeApp(firebaseConfig);

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

export { auth, db, firebaseApp };

