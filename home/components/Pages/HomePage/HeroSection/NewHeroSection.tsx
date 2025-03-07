import { FlipWords } from '@/components/ui/flip-words';
import { Mrs_Sheppards } from 'next/font/google';
import Image from 'next/image';
import React from 'react';

const words = ['Live', 'Think', 'Build', 'Unleash'];
const mrsSheppard = Mrs_Sheppards({ weight: '400', subsets: ['latin'] });
const NewHeroSection = () => {
  return (
    <div className="relative w-full">
      {/* Hero text */}
      <div className="relative z-10 flex h-[100vh] flex-col items-center justify-center gap-8 text-center">
        <h1 className="text-5xl font-extrabold text-white max-sm:px-10">
          <FlipWords words={words} /> your Tech Dream
        </h1>

        <p className="w-1/2 text-2xl font-medium text-white max-sm:w-full max-sm:px-8">
          Get world class developers & software engineers help you build your
          difficult-to-execute Idea/aspirations.
        </p>

        <p className="absolute bottom-6 left-1/2 w-4/5 -translate-x-1/2 text-lg font-normal md:w-full md:text-xl">
          The
          <span
            className={`${mrsSheppard.className} black mx-3 mt-6 text-2xl text-white md:text-4xl`}
          >
            #1
          </span>
          destination to build market ready MVPs across the globe.
        </p>
      </div>

      {/* Additional content */}
      <div className="relative z-10 flex flex-col lg:flex-col-reverse xl:flex-row items-center justify-start xl:justify-between gap-16 sm:gap-8 px-16 max-md:px-12 max-sm:px-4 h-unset sm:h-[90vh] lg:h-[70vh]">
        <div className='flex flex-[0.75] flex-col items-end text-left sm:text-right justify-end sm:gap-8 mt-20 sm:mt-0 mb-0 lg:mb-20 xl:mb-0'>
          <h1 className="text-3xl sm:text-5xl font-extrabold  text-white ">
            Paving the tech for the leading startups in the world.
          </h1>

          <p className="text-sm sm:text-lg text-white/80  max-sm:w-full">
            We work in hyper-speed sprints to achieve edge tech solutions and deliver products that aims to beat competition.
          </p>

        </div>
        <div className='flex flex-col mb-20 sm:mb-0 sm:mt-20 lg:mt-0'>
          <div className="flex items-center gap-20 px-6 max-md:gap-12 max-sm:gap-8">
            <div className="flex flex-col justify-center items-center gap-2">
              <span className="text-4xl sm:text-6xl font-black text-white">52+</span>
              <span className="text-lg text-white/80 opacity-0 h-[0em]">MVPs built</span>
            </div>

            <div className="flex flex-col justify-center items-center gap-2">
              <span className="text-4xl sm:text-6xl font-black text-white">6+</span>
              <span className="text-lg text-white/80 opacity-0 h-[0em]">Project Scaleups</span>
            </div>

            <div className="flex flex-col justify-center items-center gap-2">
              <span className="text-4xl sm:text-6xl font-black text-white">97%</span>
              <span className="text-lg text-white/80 opacity-0 h-[0em]">Clocked on Time</span>
            </div>
          </div>

          <div className="flex items-center backdrop-blur-xl px-6 py-3 rounded-[3em] gap-8 sm:gap-20 max-md:gap-12 max-sm:gap-8 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0 before:animate-pump">
            <div className="flex flex-col gap-2 relative z-10">
              <span className="text-[10px] sm:text-lg text-white font-semibold">MVPs built</span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] sm:text-lg text-white font-semibold">Project Scaleups</span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] sm:text-lg text-white font-semibold">Clocked on Time</span>
            </div>
          </div>

          <a href="#reasons" className="group relative flex ml-auto mt-3 items-center gap-2 text-md text-white font-bold hover:text-white transition-colors">
            Six Reasons on why choose us
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            <span className="absolute -bottom-2 left-[50%] h-[3px] bg-white opacity-0 group-hover:opacity-100 group-hover:animate-border-line"></span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default NewHeroSection;
