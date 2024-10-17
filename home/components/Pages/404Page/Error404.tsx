'use client'
import { useEffect, useRef, useState } from "react";
import { Error404Styled } from "./Error404.styles";
import { Link } from "react-transition-progress/next";

const Error404 = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const bgRef = useRef<HTMLSpanElement>(null);

  const handleMouseMove = (event: MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  useEffect(() => {
    if (bgRef.current) {
      const rect = bgRef.current.getBoundingClientRect();
      let xTilt = -(mousePosition.y - (rect.top + rect.height / 2)) / 200;
      let yTilt = (mousePosition.x - (rect.left + rect.width / 2)) / 200;
      if (mousePosition.x === 0 && mousePosition.y === 0) {
        xTilt = 0;
        yTilt = 0;
      }
      bgRef.current.style.transform = `perspective(1000px) rotateX(${xTilt}deg) rotateY(${yTilt}deg)`;
      bgRef.current.style.transition = "all 0.2s ease-out";
    }
  }, [mousePosition]);

  return (
    <Error404Styled>
      <div className="background_404">
        <span ref={bgRef}>404</span>
        <div className="blur_blob"></div>
      </div>
      <div className="top_heading">
        <span>404</span>
        <span>Error Page</span>
      </div>
      <div className="center_heading">
        <h1 className="title">404</h1>
        <p className="subtitle">Sorry, we couldn&apos;t find this page</p>
        <Link className="go_back" href="/">
          <span className="material-symbols-outlined"> arrow_back </span>
          <span className="go_back_text">Back To Home</span>
        </Link>
      </div>
      <div className="bottom_heading">
        <span>This page you are looking for doesn&apos;t</span>
        <span>exist or some other error occurred.</span>
      </div>
    </Error404Styled>
  );
};

export default Error404;
