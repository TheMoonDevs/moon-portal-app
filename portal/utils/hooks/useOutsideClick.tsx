import { useEffect, RefObject } from "react";

const useOutsideClick = <T extends HTMLElement>(
  refs: RefObject<T>[],
  callback: () => void
) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      for (const ref of refs) {
        if (ref.current && !ref.current.contains(event.target as Node)) {
          callback();
        }
      }
    };
    // console.log(refs);
    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [refs, callback]);
};

export default useOutsideClick;
