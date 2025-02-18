'use client';

import { useState } from 'react';
import SettingsMainSection from './SettingsMainSection';
import SettingsSidebar from './SettingsSidebar';

const Settings = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen text-neutral-800">
      <SettingsSidebar setIsDrawerOpen={setIsDrawerOpen} />
      <SettingsMainSection
        title="Notifications"
        isDrawerOpen={isDrawerOpen}
        setDrawerOpen={setIsDrawerOpen}
      />
    </div>
  );
};

export default Settings;
