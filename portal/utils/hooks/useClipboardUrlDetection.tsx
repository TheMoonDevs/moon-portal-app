import { useEffect, useState } from "react";
import { isValidURL } from "../helpers/functions";

const useClipboardURLDetection = () => {
  const [isTabFocused, setIsTabFocused] = useState(
    typeof window !== "undefined" && document.hasFocus()
  );
  const [isPasteEvent, setIsPasteEvent] = useState(false);
  const [validURLPasteEvent, setValidURLPasteEvent] = useState(false);
  const [copiedURL, setCopiedURL] = useState<string | null>(null);

  useEffect(() => {
    const handleFocus = () => {
      setIsTabFocused(true);
      setIsPasteEvent(false);
    };
    const handleBlur = () => setIsTabFocused(false);
    const handlePaste = () => setIsPasteEvent(true);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("paste", handlePaste);
    };
  }, []);

  useEffect(() => {
    const handleCopy = async () => {
      if (!isTabFocused) return;
      const text = await navigator.clipboard.readText();
      if (isValidURL(text)) {
        setCopiedURL(text);
      } else {
        setIsPasteEvent(false);
        setCopiedURL(null);
      }
      if (copiedURL && isPasteEvent) setValidURLPasteEvent(true);
      setIsPasteEvent(false);
    };
    handleCopy();
  }, [isTabFocused, isPasteEvent, validURLPasteEvent]);

  return { copiedURL, setCopiedURL, validURLPasteEvent, setValidURLPasteEvent };
};

export default useClipboardURLDetection;
