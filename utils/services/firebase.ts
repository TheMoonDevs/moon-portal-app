// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import { GoogleAuthProvider, getAuth } from "firebase/auth";
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

export const getFirebaseAuth = () => {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  return getAuth(app);
};

export const getGoogleAuthProvider = () => {
  const provider = new GoogleAuthProvider();

  return provider;
};

// Initialize Firebase
export const initializeFireAnalaytics = () => {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const analytics = getAnalytics(app);
  return analytics;
};

export const getFirebaseAnalytics = () => {
  return getApps().length === 0 ? initializeFireAnalaytics() : getAnalytics();
};

export const logEvents = (eventName: string, params?: any) => {
  if (params) logEvent(getFirebaseAnalytics(), eventName, params);
  else logEvent(getFirebaseAnalytics(), eventName);
};

const logScreenView = (
  firebase_screen: string,
  firebase_screen_class: string,
  params?: any
) => {
  return FirebaseSDK.logEvents("screen_view", {
    firebase_screen,
    firebase_screen_class,
    ...params,
  });
};

export const FirebaseSDK = {
  getFirebaseAuth,
  getGoogleAuthProvider,
  initializeAnalaytics: initializeFireAnalaytics,
  getFirebaseAnalytics,
  logEvents,
  logScreenView,
};