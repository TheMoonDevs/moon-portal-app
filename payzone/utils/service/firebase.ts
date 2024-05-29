// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBNFf-LlxBmFS9u7gSPpRNfR0bI0F8aW3w",
  authDomain: "themoondevs-web.firebaseapp.com",
  projectId: "themoondevs-web",
  storageBucket: "themoondevs-web.appspot.com",
  messagingSenderId: "745802210981",
  appId: "1:745802210981:web:9fb3f6e83d4d2b72dfb74c",
  measurementId: "G-VPN2RTQ718"
};

export enum AuthProvider {
  GOOGLE = "google.com",
}

export const getFirebaseAuth = () => {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  return getAuth(app);
};

export const getGoogleAuthProvider = () => {
  const provider = new GoogleAuthProvider();

  return provider;
};

// Initialize Firebase
// export const initializeFireAnalaytics = () => {
//   const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
//   const analytics = getAnalytics(app);
//   return analytics;
// };

// export const getFirebaseAnalytics = () => {
//   return getApps().length === 0 ? initializeFireAnalaytics() : getAnalytics();
// };

// export const logEvents = (eventName: string, params?: any) => {
//   if (params) logEvent(getFirebaseAnalytics(), eventName, params);
//   else logEvent(getFirebaseAnalytics(), eventName);
// };

// const logScreenView = (
//   firebase_screen: string,
//   firebase_screen_class: string,
//   params?: any
// ) => {
//   return FirebaseSDK.logEvents("screen_view", {
//     firebase_screen,
//     firebase_screen_class,
//     ...params,
//   });
// };

export const FirebaseSDK = {
  getFirebaseAuth,
  getGoogleAuthProvider,
  // initializeAnalaytics: initializeFireAnalaytics,
  // getFirebaseAnalytics,
  // logEvents,
  // logScreenView,
};
