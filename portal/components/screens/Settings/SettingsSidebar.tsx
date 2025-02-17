'use client';

import media from '@/styles/media';
import { useMediaQuery } from '@mui/material';
import { useState } from 'react';
import Ripples from 'react-ripples';

const NestedSidebarElements = [
  // {
  //   title: 'Account Settings',
  //   items: ['Profile'],
  // },
  {
    title: 'App Settings',
    items: ['Notifications'],
  },
];

const SettingsSidebar = ({
  setIsDrawerOpen,
}: {
  setIsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [activeTab, setActiveTab] = useState(NestedSidebarElements[0].items[0]);
  const isSmallerTablets = useMediaQuery(media.custom(640));

  return (
    <>
      <aside className="flex w-full flex-col gap-8 bg-gray-200 p-8 pl-6 sm:w-56">
        <div className="text-lg font-bold sm:hidden">Settings</div>
        <div>
          {NestedSidebarElements.map((element) => (
            <div className="mb-4 border-b border-neutral-300">
              <div key={element.title} className="mb-2">
                <div className="mb-2 pl-2 text-xs font-bold uppercase text-neutral-500">
                  {element.title}
                </div>
                {element.items &&
                  element.items.map((item) => (
                    <div className="relative cursor-pointer">
                      <div
                        onClick={() => {
                          setActiveTab(item);
                          isSmallerTablets && setIsDrawerOpen(true);
                        }}
                        key={item}
                        className={`flex items-center justify-between rounded-md px-2 py-1 text-base hover:bg-neutral-300 ${activeTab === item && !isSmallerTablets ? 'bg-white' : ''}`}
                      >
                        <span>{item}</span>
                        <span className="material-symbols-outlined !text-base">
                          arrow_forward_ios
                        </span>
                      </div>
                      <Ripples
                        placeholder={undefined}
                        onClick={() => {
                          setActiveTab(item);
                          setIsDrawerOpen(true);
                        }}
                        onPointerEnterCapture={() => {
                          setActiveTab(item);
                          setIsDrawerOpen(true);
                        }}
                        onPointerLeaveCapture={() => {
                          setActiveTab(item);
                          setIsDrawerOpen(true);
                        }}
                        className="!absolute top-0 z-50 h-full w-full rounded-lg"
                      ></Ripples>
                    </div>
                  ))}
              </div>
            </div>
          ))}
          <a
            href="#"
            className="flex items-center justify-between rounded-md px-2 py-1 text-base hover:bg-neutral-300"
          >
            <span>Logout</span>
            <span className="material-symbols-outlined !text-base">logout</span>
          </a>
        </div>
      </aside>
    </>
  );
};

export default SettingsSidebar;
