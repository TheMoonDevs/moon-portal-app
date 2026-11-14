'use client';

import {
  AppDownloadScreen,
  rememberAppSplashChoice,
  type StoreUrls,
  useStorePlatform,
} from '@/components/global/AppDownloadSplash';

export const GetTheApp = ({ storeUrls }: { storeUrls: StoreUrls }) => {
  const platform = useStorePlatform();
  return (
    <AppDownloadScreen
      storeUrls={storeUrls}
      platform={platform}
      onDone={rememberAppSplashChoice}
      continueHref="/"
    />
  );
};
