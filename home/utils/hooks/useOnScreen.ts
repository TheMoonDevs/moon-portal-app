// import { RefObject, useEffect, useMemo, useState } from "react";

// export default function useOnScreen(ref: RefObject<HTMLElement>) {
//   const [isIntersecting, setIntersecting] = useState(false);

//   const observer = useMemo(
//     () =>
//       new IntersectionObserver(([entry]) =>
//         setIntersecting(entry.isIntersecting)
//       ),
//     [ref]
//   );

//   useEffect(() => {
//     if (ref.current) {
//       observer.observe(ref.current);
//     }
//     return () => observer.disconnect();
//   }, []);

//   return isIntersecting;
// }

import { useEffect, useState, useRef, RefObject } from "react";

export default function useOnScreen(ref: RefObject<HTMLElement>) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [isOnScreen, setIsOnScreen] = useState(false);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(([entry]) =>
      setIsOnScreen(entry.isIntersecting)
    );
  }, []);

  useEffect(() => {
    if (ref.current) {
      observerRef.current?.observe(ref.current);
    }
    return () => {
      observerRef.current?.disconnect();
    };
  }, [ref]);

  return isOnScreen;
}
