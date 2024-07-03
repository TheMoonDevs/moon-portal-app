import React, { useState } from "react";
import { Tabs, Tab, Box, Typography } from "@mui/material";

interface TabInfo {
  label: string;
  content: React.ReactNode;
}

interface SimpleTabsProps {
  tabs: TabInfo[];
}

const TabPanel: React.FC<{
  children: React.ReactNode;
  value: number;
  index: number;
}> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography component="div">{children}</Typography>
        </Box>
      )}
    </div>
  );
};

const SimpleTabs: React.FC<SimpleTabsProps> = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Tabs value={activeTab} onChange={handleChange} aria-label="simple-tabs">
        {tabs.map((tab, index) => (
          <Tab
            key={index}
            label={tab.label}
            id={`simple-tab-${index}`}
            aria-controls={`simple-tabpanel-${index}`}
          />
        ))}
      </Tabs>
      {tabs.map((tab, index) => (
        <TabPanel key={index} value={activeTab} index={index}>
          {tab.content}
        </TabPanel>
      ))}
    </Box>
  );
};

export default SimpleTabs;
