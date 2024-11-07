'use client'
import { useMediaQuery } from "@mui/material";
import FolderSection from "./FolderSection";
import LinksSection from "./LinksSection";
import media from "@/styles/media";

export const QuicklinksDashboard = () => {
  const isTablet = useMediaQuery(media.tablet);
  return (
    <>
      <div className=" w-full flex gap-10">
        <div className={`w-[65%] ${isTablet && 'w-full'}`}>
          <LinksSection />
        </div>
        <div className={`w-[35%] mt-[10px] ${isTablet && 'hidden'}`}>
          <FolderSection />
        </div>
      </div>
    </>
  );
};
