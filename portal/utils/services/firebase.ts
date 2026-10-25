// Import the functions you need from the SDKs you need
import { getAnalytics, isSupported, logEvent } from 'firebase/analytics';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

import { firebaseConfig } from './firebaseConfig';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Initialize Firebase
const app = initializeApp(firebaseConfig);

//https://stackoverflow.com/a/72167004/15236909
const analytics = isSupported().then((yes) => (yes ? getAnalytics(app) : null));

export const getFirebaseAuth = () => {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  return getAuth(app);
};

export const getGoogleAuthProvider = () => {
  const provider = new GoogleAuthProvider();
  // Always show the account chooser, so people can pick any linked account.
  provider.setCustomParameters({ prompt: 'select_account' });

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
  params?: any,
) => {
  return FirebaseSDK.logEvents('screen_view', {
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
