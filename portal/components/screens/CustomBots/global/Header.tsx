'use client';

import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import { ProjectDropdown } from './ProjectDropdown';

const Header: React.FC = () => {
  const { user } = useUser();
  const router = useRouter();

  //console.log(user);
  return (
    <header className="z-9 fixed left-0 right-0 flex items-center justify-between border-b border-gray-200 px-4 py-2 font-bold text-black backdrop-blur">
      <div className="flex cursor-pointer items-center gap-2 text-2xl">
        <div
          onClick={() => {
            router.push(APP_ROUTES.customBots);
          }}
          className="flex cursor-pointer items-center gap-2 text-2xl"
        >
          <span className="material-symbols-outlined inherit">app_badging</span>
          <div>
            <h1 className="font-bold">Bot base</h1>
            {/* <p className='text-[8px] font-medium text-gray-500'>Alpha - version 1.0.1</p> */}
          </div>
        </div>
        <ProjectDropdown />
      </div>
      <div className="flex items-center gap-4 text-xl"></div>
      <div className="flex items-center gap-4 text-2xl">
        <div className="flex items-center gap-4 text-xl">
          {/* <Link
                        href={APP_ROUTES.customBots + "/idea"}
                        className='text-sm cursor-pointer font-medium text-gray-500 hover:text-black flex items-center gap-1'>
                        <span className='material-symbols-outlined inherit'>lightbulb</span>
                        The Idea</Link> */}
          <Link
            href={APP_ROUTES.customBots + '/whitepaper'}
            className="flex cursor-pointer items-center gap-1 text-sm font-medium text-gray-500 hover:text-black"
          >
            <span className="material-symbols-outlined inherit">task</span>
            Whitepaper
          </Link>
          {/* <button className='text-sm cursor-pointer font-medium text-gray-500 hover:text-black flex items-center gap-1'>
                        <span className='material-symbols-outlined inherit'>update</span>
                        Updates</button> */}
        </div>
        <span className="material-symbols-outlined inherit">settings</span>
        <span className="material-symbols-outlined inherit">notifications</span>

        <div className="flex items-center gap-4">
          <Image
            src={user?.avatar || '/images/avatar.png'}
            alt="avatar"
            width={40}
            height={40}
            className="rounded-full"
          />
        </div>
      </div>
      {/* Add your header content here */}
    </header>
  );
};

export default Header;
