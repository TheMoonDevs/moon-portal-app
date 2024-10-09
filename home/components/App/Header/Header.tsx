import { SectionWithGrids } from "@/components/Pages/HomePage/SectionWithGrids";
import { HeaderStyled } from "./Header.styles";
import Image from "next/image";
import { useMediaQuery } from "@mui/material";
import media from "@/styles/media";
import { FirebaseEvents, FirebaseSDK } from "@/utils/service/firebase";
import Link from "next/link";
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
  const router = useRouter();
  const isDefinedRoute = Object.values(APP_ROUTES).includes(router.pathname);
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
      {/* <HeaderWithGrids /> */}
      <div
        className={` relative bg-transparent my-6 mx-6 flex items-center justify-between ${open && "!bg-black mb-0 rounded-t-lg rounded-tr-lg"} max-lg:mx-2 max-lg:my-2`}
      >
        <div className="h-12 max-w-fit rounded-lg bg-black text-white flex items-center px-2 justify-between">
          <div className="flex items-center gap-3 max-lg:gap-0">
            <Image
              src="/logo/logo_white.png"
              alt="logo"
              height={36}
              width={32}
            />
            <p className="text-sm py-2 px-2 font-semibold max-lg:hidden">
              TheMoonDevs
            </p>
          </div>
          <p
            className="relative text-sm py-2 px-2 font-semibold cursor-pointer hover:bg-[#414a4c] rounded-md transition-colors duration-300 ease-in-out max-lg:hidden"
            onMouseEnter={() =>
              setShowDropdown({ pricing: false, publicBots: true })
            }
            onMouseLeave={closeDropdowns}
          >
            Public Bots
          </p>
          <p
            className="text-sm py-2 px-2 font-semibold cursor-pointer relative hover:bg-[#414a4c] rounded-md transition-colors duration-300 ease-in-out max-lg:hidden"
            onMouseEnter={() =>
              setShowDropdown({ publicBots: false, pricing: true })
            }
            onMouseLeave={closeDropdowns}
          >
            Pricing
          </p>
        </div>
        {showDropdown.publicBots && (
          <div className="absolute bg-white h-40 w-80 left-0 text-black border border-gray-300 mt-2 rounded-md p-2 top-12 shadow-lg">
            Box 1
          </div>
        )}
        {showDropdown.pricing && (
          <div className="absolute bg-white h-40 w-96 left-0 text-black border border-gray-300 mt-2 rounded-md p-2 top-12 shadow-lg">
            Box 2
          </div>
        )}

        <div className="h-12 max-w-fit rounded-lg bg-black text-white flex items-center px-2 gap-3 justify-between max-lg:gap-0">
          <div className="flex items-center ">
            <p className="text-sm py-2 px-2 font-semibold cursor-pointer border-2 border-transparent hover:bg-[#414a4c] rounded-md transition-colors duration-300 ease-in-out max-lg:hidden">
              Resources
            </p>
            <p className="text-sm py-2 px-2 font-semibold cursor-pointer border-2 border-transparent hover:bg-[#414a4c] rounded-md transition-colors duration-300 ease-in-out max-lg:hidden">
              View Demo
            </p>
            <p className="text-sm py-2 px-2 font-semibold cursor-pointer border-2 border-transparent hover:bg-[#414a4c] rounded-md transition-colors duration-300 ease-in-out max-lg:hidden">
              Sign In
            </p>
          </div>
          <button
            className="rounded-full !bg-white text-black text-sm py-2 px-4 
          font-medium flex items-center justify-center transition-all duration-300 ease-in-out
          transform hover:translate-x-1 hover:-translate-y-1 max-lg:hidden"
          >
            Start Trial
          </button>
          {/* Hamburger */}
          <button
            className="hidden max-lg:block py-2 px-1"
            onClick={() => setOpen(!open)}
          >
            <span className="material-symbols-outlined !text-2xl">
              {!open ? "menu" : "close"}
            </span>
          </button>
        </div>
      </div>
      {open && <HamBurger />}
    </div>
  );
};

Header.displayName = "Header";

const HamBurger = () => {
  return (
    <div className="text-white bg-black mx-6 rounded-bl-lg rounded-br-lg py-4 px-5 max-lg:mx-2 max-lg:my-[-10px]">
      <p className="text-2xl max-sm:text-lg font-bold py-2 flex items-center justify-between">
        Public Bots{" "}
        <span className="material-symbols-outlined">keyboard_arrow_down</span>
      </p>
      <p className="text-2xl max-sm:text-lg font-bold py-2 flex items-center justify-between">
        Resources{" "}
        <span className="material-symbols-outlined">keyboard_arrow_down</span>
      </p>
      <p className="text-2xl max-sm:text-lg font-bold py-2">Pricing</p>
      <div className="flex items-center gap-4 max-sm:gap-2 max-sm:flex-col border-t-[1px] border-gray-300 mt-6 py-4 max-sm:py-2">
        <button
          className="w-1/2 max-sm:w-full rounded-md text-sm py-2 bg-white text-black font-semibold"
          style={{ border: "2px solid white" }}
        >
          View Demo
        </button>
        <button
          className="w-1/2 max-sm:w-full rounded-md text-sm py-2 bg-black text-white font-semibold"
          style={{ border: "2px solid white" }}
        >
          Sign In
        </button>
      </div>
    </div>
  );
};
