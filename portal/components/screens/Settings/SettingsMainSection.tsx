'use client';
import DrawerComponent from '@/components/elements/DrawerComponent';
import PushSubscriptionToggleButton from '@/components/global/PushSubscriptionToggleButton';
import media from '@/styles/media';
import { Drawer, useMediaQuery } from '@mui/material';
import { useState } from 'react';

const NotificationSection = ({ title }: { title: string }) => {
  return (
    <>
      <div className="mb-6 text-xl font-bold">
        <span>{title}</span>
      </div>
      <div className="flex items-start justify-between">
        <div>
          <span>Enable Push Notifications</span>
          <p className="text-sm text-gray-400">
            Receive notifications for all events and happenings.
          </p>
        </div>
        <PushSubscriptionToggleButton type="switch" />
      </div>
    </>
  );
};

const GroupedNotificationSection = ({ title }: { title: string }) => {
  return title === 'Notifications' && <NotificationSection title={title} />;
};
const SettingsMainSection = ({
  title,
  isDrawerOpen,
  setDrawerOpen,
}: {
  title: string;
  isDrawerOpen: boolean;
  setDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const isSmallerTablets = useMediaQuery(media.custom(640));

  if (isSmallerTablets) {
    return (
      <main className="block sm:hidden">
        <Drawer
          open={isSmallerTablets && isDrawerOpen}
          anchor="right"
          onChange={() => {
            setDrawerOpen(!isDrawerOpen);
          }}
          onClose={() => {
            setDrawerOpen(false);
          }}
          PaperProps={{ sx: { width: '100%' } }}
        >
          <div className="block w-full items-start p-6">
            <span
              className="material-symbols-outlined mb-6 cursor-pointer !text-2xl hover:opacity-50 active:opacity-50"
              onClick={() => setDrawerOpen(false)}
            >
              arrow_back
            </span>
            <div>
              <GroupedNotificationSection title={title} />
            </div>
          </div>
        </Drawer>
      </main>
    );
  }
  return (
    <>
      <main className="ml-8 hidden w-1/2 p-6 sm:block">
        <GroupedNotificationSection title={title} />
      </main>
    </>
  );
};

export default SettingsMainSection;
