import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA_h9BlH7VHA6jYwgDdmSU5A_vUmQKQsj0",
  authDomain: "hopital-de-thies.firebaseapp.com",
  projectId: "hopital-de-thies",
  storageBucket: "hopital-de-thies.firebasestorage.app",
  messagingSenderId: "930244670612",
  appId: "1:930244670612:web:39939291b86c085d027081",
  measurementId: "G-W7YKDCVGRL"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

// Firestore with offline persistence built-in (modern API, no deprecated calls)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager({}) })
});
