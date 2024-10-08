import { APP_ROUTES } from "@/utils/constants/AppInfo";
import styled from "@emotion/styled";
import Link from "next/link";
import logo from "/public/logo/logo.png";
import Image from "next/image";
import media from "@/styles/media";
import { SingleLine } from "@/styles/snippets";
import { useEffect, useRef } from "react";
import { ScrollProgressBar } from "./ScrollProgressBar";
import { useImageColors } from "@/utils/hooks/useImageColors";
import { useTextBg } from "@/utils/hooks/useTextBg";

export const WorklifeHeader = ({
  title,
  children,
  imageUrl,
}: {
  title?: string;
  children: React.ReactNode;
  imageUrl: string;
}) => {
  const { colors } = useImageColors({
    ImgSrc: imageUrl,
  });

  const { bgColor } = useTextBg({
    colors: colors,
  });

  const lastScrollTop = useRef(0);
  const worklifeHeaderRef = useRef<HTMLDivElement>(null);
  const handleScroll = () => {
    const currentScrollTop = window.scrollY;
    const isScrolledDown = currentScrollTop > lastScrollTop.current;
    const isScrollUp = currentScrollTop < lastScrollTop.current;
    lastScrollTop.current = currentScrollTop;

    const headerElement = worklifeHeaderRef.current;
    if (headerElement) {
      if (isScrolledDown) {
        headerElement.classList.add("hidden");
      } else if (isScrollUp) {
        headerElement.classList.remove("hidden");
        headerElement.classList.add("active");
      }

      if (window.scrollY < 80) {
        headerElement.classList.remove("active");
      }
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div>
      <WorklifeHeaderStyled className="worklife-header">
        <div className="header" ref={worklifeHeaderRef}>
          <div className="header_nav">
            <Link href={APP_ROUTES.workLife}>WorkLife</Link>
            <span className="material-symbols-outlined ms-thin">
              chevron_right
            </span>
            <Link href={APP_ROUTES.workLife}>Culture</Link>
            <span className="material-symbols-outlined ms-thin">
              chevron_right
            </span>
            <span className="header_text">{title}</span>
          </div>
          <Link href={APP_ROUTES.index}>
            <div className="logo_container">
              <span className="logo_text">THE MOON DEVS</span>
              <Image
                src={logo}
                alt="moondevs logo"
                width={600}
                height={600}
                placeholder="blur"
                className="logo_img"
              />
            </div>
          </Link>
        </div>
        <ScrollProgressBar color={colors ? (bgColor as string) : "#000"} />
      </WorklifeHeaderStyled>
      {children}
    </div>
  );
};

const WorklifeHeaderStyled = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  font-size: 1.5rem;
  color: #fff;
  z-index: 999;

  ${media.laptop} {
    font-size: 2rem;
  }
  ${media.tablet} {
    font-size: 1rem;
  }
  ${media.largeMobile} {
    font-size: 0.5rem;
  }

  & .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 2rem 5em;
    /* position: absolute; */
    transition: all 0.2s ease-in-out;
    /* transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); */
    height: 80px;

    &.hidden {
      /* display: none; */
      opacity: 0;
      height: 0;
      padding: 0 5em;

      ${media.tablet} {
        padding: 0 2em;
      }
    }

    ${media.tablet} {
      padding: 1rem 2em;
      flex-wrap: wrap-reverse;
    }
  }

  & .active {
    background-color: black;
  }

  & .header_nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: "DB Mono", monospace;
    font-size: 0.8em;

    & a {
      color: ${(props) => props.theme.colors.black};
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
    }
  }

  & .header_text {
    font-size: 1em;
    max-width: 20ch;
    ${SingleLine}
    color: ${(props) => props.theme.colors.black};
  }

  & .logo_container {
    display: flex;
    column-gap: 0.5em;
    justify-content: space-between;
    align-items: center;
  }

  & .logo_text {
    color: #ffffff;
    font-weight: 400;
    font-size: 1rem;
    font-family: "Montserrat", "sans-serif";

    ${media.largeMobile} {
      font-size: 0.7rem;
    }
  }

  & .logo_img {
    filter: invert(100%);
    width: 2rem;
    aspect-ratio: 1 / 1;
    ${media.tablet} {
      width: 1rem;
    }
  }
`;
