import { useState, useEffect } from 'react';
import workbox from 'workbox-window';

export const usePWAUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  console.log(navigator.serviceWorker);

  useEffect(() => {
    async function detectSWUpdate() {
      const registration = await navigator.serviceWorker.ready;
      console.log(registration);
      registration.addEventListener('updatefound', (event) => {
        const newSW = registration.installing;
        newSW?.addEventListener('statechange', (event) => {
          if (newSW.state == 'installed') {
            // New service worker is installed, but waiting activation
            console.log(
              'New service worker is installed, but waiting activation'
            );
            setUpdateAvailable(true);
          }
        });
      });
    }

    detectSWUpdate();
  }, []);

  return updateAvailable;
};

const PWAUpdate = () => {
  const updateAvailable = usePWAUpdate();

  return (
    <>
      PWA
      {updateAvailable && <p>Update available!</p>}
    </>
  );
};

export default PWAUpdate;
