/*
 * Where to download the Portal app. Set MOBILE_APP_STORE_URL to the App Store
 * page (https://apps.apple.com/app/id…) once it's live; until then the App
 * Store button opens a store search for the app. MOBILE_PLAY_STORE_URL is
 * optional, the Play listing is known from the package name.
 */
export const APP_STORE_SEARCH_URL =
  'https://apps.apple.com/search?term=Portal%20by%20TheMoonDevs';
export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.themoondevs.portal';

export const getStoreUrls = () => ({
  ios: process.env.MOBILE_APP_STORE_URL || null,
  android: process.env.MOBILE_PLAY_STORE_URL || PLAY_STORE_URL,
});
