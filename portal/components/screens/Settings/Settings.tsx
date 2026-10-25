'use client';

import { useState } from 'react';

import SettingsMainSection from './SettingsMainSection';
import SettingsSidebar, { NestedSidebarElements } from './SettingsSidebar';

const Settings = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(NestedSidebarElements[0].items[0]);

  return (
    <div className="flex h-screen text-neutral-800">
      <SettingsSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setIsDrawerOpen={setIsDrawerOpen}
      />
      <SettingsMainSection
        title={activeTab}
        isDrawerOpen={isDrawerOpen}
        setDrawerOpen={setIsDrawerOpen}
      />
    </div>
  );
};

export default Settings;
