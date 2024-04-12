"use client";

import media from "@/styles/media";
import { useMediaQuery } from "@mui/material";
import { Bottombar } from "@/components/global/Bottombar";

export default function ShowHideBottomBar() {
  const isTabletAndLaptop = useMediaQuery(media.moreTablet);
  return <>{isTabletAndLaptop && <Bottombar visible={isTabletAndLaptop} />}</>;
}
