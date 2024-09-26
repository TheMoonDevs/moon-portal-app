// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
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
  appId: "1:745802210981:web:481ba5d3cb2591badfb74c",
  measurementId: "G-4RRW56RSX8",
};

export enum FirebaseEvents {
  CLICKED_CTA_IN_HEADER = "clicked_cta_in_header",
  CLICKED_CTA_IN_HEROSECTION = "clicked_cta_in_herosection",
  SCREEN_NAME_HEROSECTION = "HeroSection",
  SCREEN_CLASS_HEROSECTION = "HeroSectionClass",
  SCREEN_NAME_BENEFITSSECTION = "BenefitsSection",
  SCREEN_CLASS_BENEFITSSECTION = "BenefitsSectionClass",
  SCREEN_NAME_FAQSECTION = "FAQSection",
  SCREEN_CLASS_FAQSECTION = "FAQSectionClass",
  SURVEY_STARTED = "survey_started",
  SURVEY_FIFTY_PERCENT = "survey_fifty_percent",
  SURVEY_ENDED = "survey_ended",
  SURVEY_SUBMITTED = "survey_submitted",
}

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
