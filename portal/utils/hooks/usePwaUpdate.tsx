import { useEffect, useState } from "react";

export const usePwaUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener("statechange", () => {
              if (installingWorker.state === "installed") {
                if (navigator.serviceWorker.controller) {
                  console.log("New content is available; please refresh.");
                  setUpdateAvailable(true);
                } else {
                  console.log("Content is cached for offline use.");
                }
              }
            });
          }
        });
      });
    }
  }, []);

  const handleUpdate = () => {
    console.log("serviceWorker" in navigator);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          // send the skip message to kick off the service worker install.
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
          // add an listener to reload page when the new service worker is ready.
          registration.waiting.addEventListener(
            "statechange",
            (event: Event) => {
              const { state = "" } =
                (event.target as unknown as { state: string }) || {};
              if (state === "activated") {
                window.location?.reload();
              }
            }
          );
        }
      });
    }
  };

  return {
    updateAvailable,
    handleUpdate,
  };
};
