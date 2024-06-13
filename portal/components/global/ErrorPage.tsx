"use client"
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const ErrorPage = () => {
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
        <ErrorPageStyled>
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
        </ErrorPageStyled>
    );
};

export default ErrorPage;

import styled from "@emotion/styled";
import media from "@/styles/media";

export const ErrorPageStyled = styled.div`
  height: 100dvh;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  position: relative;
  /* background: rgba(0, 0, 0, 0.5); */
  overflow: hidden;
  color: ${(props) => props.theme.fixedColors.textGrey};

  .blur_blob {
    --inset: 100px;
    --blur: 8px;

    position: absolute;
    inset: 0;
    border-radius: var(--radius);
    -webkit-backdrop-filter: blur(var(--blur));
    backdrop-filter: blur(var(--blur));

    -webkit-mask-image: radial-gradient(
        ellipse at top right,
        transparent 60%,
        black 70%,
        black 100%
      ),
      radial-gradient(
        ellipse at bottom left,
        transparent 60%,
        black 70%,
        black 100%
      );

    -webkit-mask-size: 130% 130%;

    -webkit-mask-position:
      100% 0,
      0 100%;

    -webkit-mask-repeat: no-repeat;
    animation: moveBlur 3s infinite ease-in-out;
  }

  & .background_404 {
    position: absolute;
    top: 0;
    left: 0;
    height: 100dvh;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 50rem;
    font-weight: 900;
    color: #2a2a2a;
    background: black;
    z-index: -1;
    transform: scale(0);
    animation:
      /* blurAnimation 3s infinite, */ scaleAnimation 2s forwards;

    > span {
      margin-top: -120px;
    }

    ${media.laptop} {
      font-size: 30rem;
    }

    ${media.tablet} {
      font-size: 20rem;
    }

    ${media.largeMobile} {
      font-size: 12rem;
    }
  }

  & .top_heading,
  .bottom_heading,
  .center_heading {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-transform: uppercase;
  }

  & .top_heading {
    padding-top: 2rem;
    font-weight: 900;
    animation: fadeInDropTop 2s forwards;
    animation-delay: 2s;
    opacity: 0;
    color: ${(props) => props.theme.fixedColors.textGrey};
  }

  & .bottom_heading {
    font-size: 0.8rem;
    padding-bottom: 2rem;
    font-weight: 600;
    animation: fadeInDropBottom 2s forwards;
    animation-delay: 2s;
    opacity: 0;
    color: ${(props) => props.theme.fixedColors.textGrey};
  }

  & .center_heading {
    animation: fadeIn 2s forwards;
    animation-delay: 1.5s;
    opacity: 0;

    & .title {
      font-size: 1.5rem;
      font-weight: 900;
      /* margin-bottom: 1.5rem; */

      ${media.tablet} {
        font-size: 1.5rem;
      }
    }

    & .subtitle {
      text-transform: uppercase;
      font-weight: 500;
    }

    & .go_back {
      background-color: transparent;
      font-style: italic;
      /* border: 1px solid white; */
      color: white;
      font-size: 1rem;
      padding: 0.5rem 1rem;
      /* border-radius: 0.5rem; */
      cursor: pointer;
      /* transition: max-width 1s ease-in-out; */
      display: flex;
      align-items: center;
      gap: 0.5rem;

      > span {
        font-size: 1rem;
      }

      &:hover {
        & .go_back_text:after {
          max-width: 100%;
        }
      }
      & .go_back_text {
        position: relative;
        &:after {
          transition: max-width 0.2s ease-in;
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          max-width: 0;
          background-color: white;
        }
      }

      ${media.tablet} {
        font-size: 1rem;
        padding: 0.25rem 0.5rem;
      }
    }
  }

  @keyframes moveBlur {
    0%,
    100% {
      -webkit-mask-position:
        100% 0,
        0 100%;
    }
    50% {
      -webkit-mask-position:
        0 100%,
        100% 0;
    }
  }

  @keyframes scaleAnimation {
    0% {
      transform: scale(10);
    }
    100% {
      transform: scale(1.06);
    }
  }

  @keyframes fadeIn {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  @keyframes fadeInDropTop {
    0% {
      opacity: 0;
      transform: translateY(-50px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeInDropBottom {
    0% {
      opacity: 0;
      transform: translateY(50px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;