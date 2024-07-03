import { useEffect, useState } from "react";
import { isValidURL } from "../helpers/functions";

const useClipboardURLDetection = (reactToClipboard: boolean = true) => {
  const [copiedURL, setCopiedURL] = useState<string | null>(null);

  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData("text");
      if (text && isValidURL(text) && reactToClipboard) {
        setCopiedURL(text);
      } else {
        setCopiedURL(null);
      }
    };

    if (reactToClipboard) {
      window.addEventListener("paste", handlePaste);
    }

    return () => {
      if (reactToClipboard) {
        window.removeEventListener("paste", handlePaste);
      }
    };
  }, [reactToClipboard]);

  return { copiedURL, setCopiedURL };
};

export default useClipboardURLDetection;
