// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBBKvCt63eKFwHrFx6iOT2Dbj70Atz7lIc",
  authDomain: "themoondevs.firebaseapp.com",
  projectId: "themoondevs",
  storageBucket: "themoondevs.appspot.com",
  messagingSenderId: "731981843950",
  appId: "1:731981843950:web:3a4757641b028d603c92ff",
  measurementId: "G-N7LB3LY627"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);