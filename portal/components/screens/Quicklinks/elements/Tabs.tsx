"use client";

import { styled, Tab, Tabs } from "@mui/material";
import { useState } from "react";

const QuicklinksTabs = ({
  children,
  tabs,
}: {
  children: (value: number) => React.ReactNode;
  tabs: string[];
}) => {
  const [value, setValue] = useState(0);

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
    <div className="bg-white ">
      <AntTabs
        className="mb-3"
        value={value}
        onChange={handleChange}
        aria-label="ant example"
      >
        {tabs.map((tab, index) => (
          <AntTab label={tab} key={index} />
        ))}
        <div className="py-3 flex items-center">
          <span className="material-symbols-outlined !font-extralight">
            search
          </span>
        </div>
        {/* <AntTab label="Tab 3" /> */}
      </AntTabs>

      {children(value)}
    </div>
  );
};

export default QuicklinksTabs;
