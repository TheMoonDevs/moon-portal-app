import React from "react";

const useMousePosition = () => {
  const [mousePosition, setMousePosition] = React.useState({
    x: 0,
    y: 0,
    xfromcenter: 0,
    yfromcenter: 0,
  });

  React.useEffect(() => {
    let animationFrameId: number | null = null;

    const updateMousePosition = (ev: any) => {
      // Calculate the mouse position relative to the center of the viewport
      const centerX = ev.clientX - window.innerWidth / 2;
      const centerY = ev.clientY - window.innerHeight / 2;

      setMousePosition({
        x: ev.clientX,
        y: ev.clientY,
        xfromcenter: centerX,
        yfromcenter: centerY,
      });
    };

    const handleMouseMove = (ev: any) => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = window.requestAnimationFrame(() =>
        updateMousePosition(ev)
      );
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return mousePosition;
};

export default useMousePosition;
