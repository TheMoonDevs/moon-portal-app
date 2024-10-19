'use client'
import { SectionWithGrids } from "@/components/Pages/HomePage/SectionWithGrids";
import { HeaderStyled } from "./Header.styles";
import Image from "next/image";
import { useMediaQuery } from "@mui/material";
import media from "@/styles/media";
import { FirebaseEvents, FirebaseSDK } from "@/utils/service/firebase";
import { Link } from "react-transition-progress/next";
import { APP_INFO, APP_ROUTES } from "@/utils/constants/AppInfo";
import theme from "@/styles/theme";
import { forwardRef, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { usePathname } from "next/navigation";

export const HeaderComponent = () => {
  const isMobile = useMediaQuery(media.largeMobile);
  return (
    <HeaderStyled>
      <Link href={APP_ROUTES.index}>
        <div className="logobar">
          <Image src="/logo/logo.png" alt="" width={36} height={36} />
          <span className="app_title">The Moon Devs</span>
        </div>
      </Link>
      <Link href={APP_ROUTES.getStarted}>
        <div
          className="button_trial"
          onClick={() => {
            FirebaseSDK.logEvents(FirebaseEvents.CLICKED_CTA_IN_HEADER);
          }}
        >
          <div className="button_icon">
            <span className="material-symbols-outlined ms-thick">task_alt</span>
          </div>
          <div className="button_text">
            {isMobile ? "Start Trial" : "Start Trial Now."}
          </div>
        </div>
      </Link>
    </HeaderStyled>
  );
};

export const HeaderWithGrids = SectionWithGrids(HeaderComponent, {
  // backgroundColor: theme.fixedColors.whiteSmoke,
  color: theme.fixedColors.lightSilver,
});

export const Header = () => {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [showDropdown, setShowDropdown] = useState({
    publicBots: false,
    pricing: false,
  });
  const [open, setOpen] = useState(false);

  const path = usePathname();
  // const router = useRouter();
  const isDefinedRoute = Object.values(APP_ROUTES).includes(path as string);
  const showHeader =
    isDefinedRoute &&
    !path?.startsWith("/worklife") &&
    !path?.startsWith("/offers");

  const closeDropdowns = () => {
    setShowDropdown({ publicBots: false, pricing: false });
  };

  useEffect(() => {
    //console.log("Header mounted");

    const headerRefCurrent = headerRef.current;
    if (!headerRefCurrent) return;

    const headerElement = headerRefCurrent as HTMLDivElement;
    const headerBottomBorder = headerElement.querySelector(
      ".section_with_grids"
    ) as HTMLElement;
    const headerLeftGrid = headerElement.querySelector(
      ".left_grid"
    ) as HTMLElement;
    const headerRightGrid = headerElement.querySelector(
      ".right_grid"
    ) as HTMLElement;

    const options = {
      root: null,
      rootMargin: "0px 0px -100% 0px",
      threshold: 0,
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const section = entry.target as HTMLElement;
        const sectionBgColor = section.style.backgroundColor;
        const sectionBorderColor = section.style.borderColor;

        if (
          headerBottomBorder &&
          sectionBorderColor &&
          headerLeftGrid &&
          headerRightGrid &&
          sectionBgColor
        ) {
          headerElement.style.backgroundColor = sectionBgColor || "";
          headerBottomBorder.style.borderBottomColor = sectionBorderColor;
          headerLeftGrid.style.borderRightColor = sectionBorderColor;
          headerRightGrid.style.borderLeftColor = sectionBorderColor;
        }
      });
    };

    const sectionObserver = new IntersectionObserver(
      handleIntersection,
      options
    );
    const sectionWithGrid = document.querySelectorAll(".section_with_grids");

    sectionWithGrid.forEach((section) => {
      sectionObserver.observe(section);
    });

    return () => {
      //console.log("Header unmounted");
      sectionObserver.disconnect();
    };
  }, [path]);

  if (!showHeader) return null;
  return (
    <div
      ref={headerRef}
      style={{
        position: "fixed",
        width: "100%",
        top: 0,
        zIndex: 100,
        transition: "0.3s background-color ease-in-out",
        background: "transparent",
      }}
    >
      <HeaderWithGrids />
    </div>
  );
};

Header.displayName = "Header";
