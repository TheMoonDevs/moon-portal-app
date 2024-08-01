import { useEffect, useRef, useState } from "react";
import { isValidURL } from "../helpers/functions";
import { toast } from "sonner";
import { useAppSelector } from "../redux/store";

const useClipboardURLDetection = () => {
  // const [isTabFocused, setIsTabFocused] = useState(
  //   typeof window !== "undefined" && document.hasFocus()
  // );
  const [copiedURL, setCopiedURL] = useState<string | null>(null);
  const { isCreateLinkModalOpen } = useAppSelector((state) => state.quicklinks);
  useEffect(() => {
    // const handleFocus = () => {
    //   setIsTabFocused(true);
    // };
    // const handleBlur = () => setIsTabFocused(false);
    const handlePaste = async () => {
      if (isCreateLinkModalOpen) return;
      const text = await navigator.clipboard.readText();
      if (isValidURL(text)) {
        setCopiedURL(text);
      } else {
        setCopiedURL(null);
        toast.error("Invalid URL");
      }
    };
    // window.addEventListener("focus", handleFocus);
    // window.addEventListener("blur", handleBlur);
    window.addEventListener("paste", handlePaste);

    return () => {
      // window.removeEventListener("focus", handleFocus);
      // window.removeEventListener("blur", handleBlur);
      window.removeEventListener("paste", handlePaste);
    };
  }, [copiedURL, isCreateLinkModalOpen]);

  // useEffect(() => {
  //   const handleCopy = async () => {
  //     if (!isTabFocused) return;
  //     const text = await navigator.clipboard.readText();
  //     if (isValidURL(text)) {
  //       setCopiedURL(text);
  //     } else {
  //       setCopiedURL(null);
  //     }
  //   };
  //   handleCopy();
  // }, [copiedURL, isTabFocused]);

  return { copiedURL, setCopiedURL };
};

export default useClipboardURLDetection;
