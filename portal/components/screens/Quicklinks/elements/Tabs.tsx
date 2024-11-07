"use client";

import media from "@/styles/media";
import { setIsParentDirectoryFoldersOpen } from "@/utils/redux/quicklinks/slices/quicklinks.ui.slice";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { IconButton, styled, Tab, Tabs, useMediaQuery } from "@mui/material";
import { useEffect, useRef, useState } from "react";

const QuicklinksTabs = ({
  children,
  tabs,
  isParentDir
}: {
  children: (value: number, searchQuery?: string) => React.ReactNode;
  tabs: string[];
  isParentDir?: boolean;
}) => {
  const [value, setValue] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const targetRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const { isParentDirectoryFoldersOpen } = useAppSelector((state) => state.quicklinksUi)
  const dispatch = useAppDispatch();
  const isTablet = useMediaQuery(media.tablet);

  const showSearchInput = isHovered || isFocused;

  useEffect(() => {
    if (!showSearchInput && targetRef.current) {
      targetRef.current.value = "";
      setSearchQuery("");
    }
  }, [showSearchInput]);
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const AntTabs = styled(Tabs)({
    borderBottom: "1px solid #e8e8e8",
    "& .MuiTabs-indicator": {
      backgroundColor: "#1890ff",
    },
  });

  const AntTab = styled((props: any) => <Tab disableRipple {...props} />)(
    ({ theme }) => ({
      textTransform: "none",
      minWidth: 0,
      [theme.breakpoints.up("sm")]: {
        minWidth: 0,
      },
      fontWeight: theme.typography.fontWeightRegular,
      marginRight: theme.spacing(1),
      color: "rgba(0, 0, 0, 0.85)",
      fontFamily: [
        "-apple-system",
        "BlinkMacSystemFont",
        '"Segoe UI"',
        "Roboto",
        '"Helvetica Neue"',
        "Arial",
        "sans-serif",
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(","),
      "&:hover": {
        color: "#40a9ff",
        opacity: 1,
      },
      "&.Mui-selected": {
        color: "#1890ff",
        fontWeight: theme.typography.fontWeightMedium,
      },
      "&.Mui-focusVisible": {
        backgroundColor: "#d1eaff",
      },
    })
  );

  return (
    <div className="space-y-3 bg-white">
      <div className={`flex items-center gap-2 ${isTablet && 'flex-col'} max-sm:gap-0`}>
        <div className={`flex items-center justify-between gap-2 ${isTablet && 'w-full'}`}>
          <input
            // ref={targetRef}
            placeholder="Search Folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`my-3  w-full rounded-2xl border border-gray-700 bg-transparent p-3 placeholder-gray-500 shadow-md outline-none transition-all duration-300 focus:border-b-2 focus:border-gray-600 ${isTablet ? 'block' : 'hidden'}`}
          />
          {isParentDir && (
            <IconButton
              onClick={() => {
                dispatch(setIsParentDirectoryFoldersOpen(!isParentDirectoryFoldersOpen))
              }}
            >
              <span className="material-symbols-outlined">folder</span>
            </IconButton>
          )}
        </div>
        <AntTabs
          className="mb-3"
          value={value}
          onChange={handleChange}
          aria-label="ant example"
        >
          {tabs.map((tab, index) => (
            <AntTab label={tab} key={index} />
          ))}
        </AntTabs>
        <div
          className={`flex items-center rounded-full px-1 py-2 transition-all duration-500 ${isTablet && 'hidden'} ${
            showSearchInput ? 'w-60 bg-neutral-100' : 'w-10'
          }`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          // style={{ transition: "width 0.5s ease-in-out" }}
        >
          <span className="material-symbols-outlined rounded-full !font-extralight">
            search
          </span>

          <input
            ref={targetRef}
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`border-b border-black bg-transparent outline-none transition-all duration-300 focus:border-b-2 ${
              showSearchInput ? 'w-full' : 'w-0'
            }`}
            // style={{ transition: "width 0.5s ease-in-out" }} // Optional inline transition if needed
          />
        </div>
      </div>

      {children(value, searchQuery.toLowerCase())}
    </div>
  );
};

export default QuicklinksTabs;
