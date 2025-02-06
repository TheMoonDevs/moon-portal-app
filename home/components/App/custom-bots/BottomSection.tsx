'use client';
import Image from 'next/image';
import React from 'react';

const BottomSection = () => {
  return (
    <div className='relative w-full h-[1200px]'>
      <div className='absolute top-0 left-0 w-full h-full z-0'>
        <Image
          src='/images/ageOfBots.png'
          alt='hero'
          fill
          className='object-cover'
          loading='lazy'
        />
      </div>
      <div className='relative z-10 flex flex-col justify-center items-center py-56 gap-8'>
        <h1 className='font-bold text-4xl text-center'>
          The New Age of Bots <br /> is AI-first & Custom-built.
        </h1>
        <button className='bg-black py-3 px-6 rounded-2xl font-medium text-xl'>
          Begin Trial
        </button>
      </div>
    </div>
  );
};

export default BottomSection;
