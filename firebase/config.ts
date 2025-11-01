import { initializeApp } from "@firebase/app";
import { getAuth } from "@firebase/auth";
import { getFirestore } from "@firebase/firestore";
import { getStorage } from "@firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAUWvuLDhAOKqbFIWfdvCBXQB3ZLRflVKM",
  authDomain: "my-grievance-a5a26.firebaseapp.com",
  projectId: "my-grievance-a5a26",
  storageBucket: "my-grievance-a5a26.appspot.com",
  messagingSenderId: "254741769803",
  appId: "1:254741769803:web:b4b2a27de06fc14ff167ce",
  measurementId: "G-V6Y89GR64Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);