import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA_h9BlH7VHA6jYwgDdmSU5A_vUmQKQsj0",
  authDomain: "hopital-de-thies.firebaseapp.com",
  projectId: "hopital-de-thies",
  storageBucket: "hopital-de-thies.firebasestorage.app",
  messagingSenderId: "930244670612",
  appId: "1:930244670612:web:39939291b86c085d027081",
  measurementId: "G-W7YKDCVGRL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testQuery() {
    try {
        console.log("Testing query...");
        const code = "TESTCODE";
        const q = query(collection(db, 'appointments'));
        const snapshot = await getDocs(q);
        console.log("Query success! Empty:", snapshot.empty);
    } catch (e) {
        console.error("Query failed:", e.message);
    }
    process.exit(0);
}

testQuery();
