import { FlipWords } from '@/components/ui/flip-words';
import Image from 'next/image';
import React from 'react';

const words = ['Live', 'Think', 'Build', 'Unleash'];

const NewHeroSection = () => {
  return (
    <div className='relative w-full'>
      {/* Image section */}
      <div className='absolute top-0 left-0 w-full h-full z-0'>
        <Image
          src='/images/hero.png'
          alt='hero'
          className='w-full h-full object-cover'
          fill
          loading='lazy'
        />
      </div>

      {/* Hero text */}
      <div className='relative z-10 h-[100vh] flex flex-col items-center justify-center gap-8 text-center'>
        <h1 className='text-white text-5xl font-extrabold max-sm:px-10'>
          <FlipWords words={words} /> your Tech Dream
        </h1>

        <p className='font-medium text-2xl w-1/2 text-white max-sm:w-full max-sm:px-8'>
          Get world class developers & software engineers help you build your
          difficult-to-execute Idea/aspirations.
        </p>
      </div>

      {/* Additional content */}
      <div className='relative z-10 flex flex-col '>
        <h1 className='w-1/2 px-16 flex justify-end items-end text-end text-5xl font-extrabold text-white max-md:w-[80%] max-md:px-12 max-sm:w-full max-sm:px-4'>
          Paving the tech for the leading startups in the world.
        </h1>
        
      </div>
      <div className='relative z-10 flex flex-col items-center py-16 gap-16 max-md:gap-12 max-sm:gap-8 max-sm:py-12 max-sm:items-start'>
          <p className='flex flex-col gap-4 w-1/4 text-lg font-medium text-white max-md:w-1/2 max-sm:w-full max-sm:px-4 '>
            <span>
              Innovation is the name of our game. We work in hyper-speed sprints
              to achieve edge tech solutions and deliver products that aim to
              beat the competition.
            </span>
            <span>We strive to excel.</span>
          </p>
          <div className='flex items-center gap-4 max-sm:px-4'>
            <button
              className='bg-black px-4 py-2 rounded-2xl font-medium '
              style={{ border: '2px solid black' }}
            >
              Start Trial
            </button>
            <button
              className='px-4 py-2 rounded-2xl font-medium'
              style={{ border: '2px solid white' }}
            >
              View Demo
            </button>
          </div>
          <div className='p-12 text-3xl font-extrabold text-white w-full flex items-center justify-center max-md:p-8'>
            Footer
          </div>
        </div>
    </div>
  );
};

export default NewHeroSection;
