import React from "react";
import Image from "next/image";
import { WorklifeFooter } from "@/components/Pages/worklife/WorkLifeHomePage/WorklifeFooter";
import bgImage from "/public/images/worklife-footer-03.jpg";
import logo from "/public/logo/logo.png";
import { UserForm } from "@/components/Pages/worklife/JobApply/UserForm";
import { JobInfo } from "@/components/Pages/worklife/JobApply/JobInfo";
import { JobApplicationPageStyled } from "./JobApplicationPage.styles";
import { JobSlice } from "@/prismicio-types";
import Link from "next/link";
import { APP_ROUTES } from "@/utils/constants/AppInfo";

export const JobApplicationPage = ({
  spreadsheetId,
  sheetId,
  rowHeaders,
  slice,
}: {
  spreadsheetId: string;
  sheetId: string;
  rowHeaders: string[];
  slice: JobSlice;
}) => {
  return (
    <JobApplicationPageStyled
      style={{
        //backgroundImage: `url(${bgImage.src})`,
        backgroundColor: "#000",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="overlay_gradient"></div>
      <div className="header">
        <div className="header_nav">
          <Link href={APP_ROUTES.workLife}>WorkLife</Link>
          <span className="material-symbols-outlined ms-thin">
            chevron_right
          </span>
          <Link href={`${APP_ROUTES.careers}`}>
            <span className="header_text">Apply</span>
          </Link>
          <span className="material-symbols-outlined ms-thin">
            chevron_right
          </span>
          <span className="header_text">{slice?.primary?.title}</span>
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
      <div className="content_section">
        <div className="content_wrapper">
          <div className="main_content">
            <div className="job_section">
              <div className="job_header">
                <span className="indicator"></span>
                <span className="job_header_text">
                  {slice?.primary?.department}
                </span>
              </div>
              <div className="job_container">
                <JobInfo slice={slice} />
                <UserForm
                  slice={slice}
                  spreadsheetId={spreadsheetId}
                  sheetId={sheetId}
                  rowHeaders={rowHeaders}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* <div className="bg-white h-[50px] w-full bg-gradient-to-b from-[#cae683] to-[#de676f]"></div> */}
      <WorklifeFooter />
    </JobApplicationPageStyled>
  );
};
