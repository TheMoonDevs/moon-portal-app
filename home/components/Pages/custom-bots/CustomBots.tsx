'use client';
import BottomSection from '@/components/App/custom-bots/BottomSection';
import CustomBotsHero from '@/components/App/custom-bots/CustomBotsHero';
import ToolTip from '@/components/App/Global/ToolTip';
import Image from 'next/image';
import React from 'react';

const CustomBotsPage = () => {
  return (
    <>
      <CustomBotsHero />
      <div className='h-32 flex items-center justify-center bg-[#ababab]'>
        lorem ipsum
      </div>
      <div className='h-32 flex items-center justify-center bg-[#fff] text-black'>
        lorem ipsum
      </div>
      <BottomSection />
    </>
  );
};

export default CustomBotsPage;
