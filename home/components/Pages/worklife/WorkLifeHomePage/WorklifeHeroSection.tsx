import React from "react";
import Image from "next/image";
import { WorklifeHeroStyled } from "./WorklifeHeroSection.styles";
import { useMediaQuery } from "@mui/material";
import media from "@/styles/media";
import Link from "next/link";
export const WorklifeHeroSection = (): JSX.Element => {
  const isMobile = useMediaQuery(media.largeMobile);
  return (
    <WorklifeHeroStyled>
      {isMobile ? (
        <Image
          src="/images/worklife-bg-portrait-2.jpg"
          alt="moon devs logo"
          width={2000}
          height={2000}
          className="wl_hero_bg"
        />
      ) : (
        <Image
          src="/images/worklife-bg-4.jpg"
          alt="moon devs logo"
          width={2000}
          height={2000}
          className="wl_hero_bg"
        />
      )}
      <div className="wl_hero_section">
        <div className="hero_header">
          <div className="header_logo">
            <Image
              className="logo_image"
              src="/logo/logo.png"
              alt="moon devs logo"
              width={50}
              height={50}
            />
            <span className="logo_text">THE MOON DEVS</span>
          </div>
          <Link href="/">
            <div className="home_btn">
              <span className="material-symbols-outlined">
                <span className="material-symbols-outlined">arrow_back_ios</span>
              </span>
              <span>BACK TO HOME</span>
            </div>
          </Link>
        </div>
        <div className="wl_hero_body ">
          <h1 className="wl_hero_body_heading slide_in_herosection">
            Re-Inventing <br /> Work
          </h1>
          <p className="wl_hero_body_text">
            We are a team of passionate individuals who believe in creating a
            workplace that is fun, engaging and productive.
          </p>
          <span className="material-symbols-outlined text-white icon_scroll">
            south
          </span>
        </div>
        <div className="wl_hero_bottom_div">
          <div className="up_down_herosection">
            <span className="wl_hero_bottom_text fade_in_herosection">
              Welcome to a workplace where work is fun!
            </span>
          </div>
        </div>
      </div>
    </WorklifeHeroStyled>
  );
};
