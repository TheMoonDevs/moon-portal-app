"use client";

import { styled, Tab, Tabs } from "@mui/material";
import { useEffect, useRef, useState } from "react";

const QuicklinksTabs = ({
  children,
  tabs,
}: {
  children: (value: number, searchQuery?: string) => React.ReactNode;
  tabs: string[];
}) => {
  const [value, setValue] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const targetRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);

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
    <div className="bg-white space-y-3">
      <div className="flex items-center gap-2">
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
          className={`flex items-center  rounded-full px-1 py-2 transition-all duration-500 ${
            showSearchInput ? "w-60 bg-neutral-100" : "w-10"
          }`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          // style={{ transition: "width 0.5s ease-in-out" }}
        >
          <span className="material-symbols-outlined !font-extralight rounded-full">
            search
          </span>

          <input
            ref={targetRef}
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`outline-none border-b focus:border-b-2 border-black bg-transparent transition-all duration-300 ${
              showSearchInput ? "w-full" : "w-0"
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
