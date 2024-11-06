'use client'
import React from "react";
import Image from "next/image";
import { WorklifeFooterStyled } from "./WorklifeFooter.styles";
import { usePathname } from "next/navigation";
import { APP_ROUTES } from "@/utils/constants/AppInfo";
import { Link } from "@/components/App/Global/react-transition-progress/CustomLink";
export const WorklifeFooter = () => {
  const path = usePathname();
  return (
    <WorklifeFooterStyled>
      <Image
        src="/images/worklife-footer-02.jpg"
        alt="Worklife Hero background image"
        width={2000}
        height={2000}
        className="wl_footer_bg"
      />
      <div className="wl_footer_section">
        <div className="wl_footer_content">
          <div className="wl_footer_logo">
            <Image
              src="/logo/logo.png"
              alt="moon devs logo"
              width={100}
              height={100}
            />
          </div>
          <div className="wl_footer_title_container">
            <h2 className="wl_footer_title">
              Great culture cascades into
              <br />
              delivering greater innovation
            </h2>
            <p className="wl_footer_subtitle">
              Enter a world where work is interesting, and the atmosphere
              exciting.
            </p>
          </div>
          <div className="wl_footer_links_container">
            <Link
              className={`wl_links ${
                path === APP_ROUTES.index ? "active" : ""
              }`}
              href="/"
            >
              Home
            </Link>
            <Link
              className={`wl_links ${
                path === APP_ROUTES.workLife ? "active" : ""
              }`}
              href={APP_ROUTES.workLife}
            >
              Work-life
            </Link>
            <Link
              className={`wl_links ${
                path === APP_ROUTES.careers ? "active" : ""
              }`}
              href={APP_ROUTES.careers}
            >
              Careers
            </Link>
            <Link
              className={`wl_links ${
                path === APP_ROUTES.story ? "active" : ""
              }`}
              href={APP_ROUTES.story}
            >
              Story of Us
            </Link>
          </div>
        </div>
        <div className="wl_footer_bottom">
          <span>THE MOON DEVS</span>
          <span># Live your dream</span>
          <span>&copy;2024</span>
        </div>
      </div>
    </WorklifeFooterStyled>
  );
};
