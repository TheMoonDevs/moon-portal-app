import { useEffect, useState } from "react";
import { isValidURL } from "../helpers/functions";

const useClipboardURLDetection = () => {
  const [isTabFocused, setIsTabFocused] = useState(
    typeof window !== "undefined" && document.hasFocus()
  );
  const [copiedURL, setCopiedURL] = useState<string | null>(null);

  useEffect(() => {
    const handleFocus = () => setIsTabFocused(true);
    const handleBlur = () => setIsTabFocused(false);

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    const handleCopy = async () => {
      if (!isTabFocused) return;
      const text = await navigator.clipboard.readText();
      if (isValidURL(text)) {
        console.log(text);
        setCopiedURL(text);
      } else {
        setCopiedURL(null);
      }
    };
    handleCopy();
  }, [isTabFocused]);

  return { copiedURL, setCopiedURL };
};

export default useClipboardURLDetection;
