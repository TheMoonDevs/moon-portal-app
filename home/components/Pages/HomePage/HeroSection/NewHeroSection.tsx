import { FlipWords } from '@/components/ui/flip-words';
import { Mrs_Sheppards } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

const words = ['Kickstart with an MVP', 'work with edge-tech devs', 'scale-up your start-up'];
const mrsSheppard = Mrs_Sheppards({ weight: '400', subsets: ['latin'] });
const NewHeroSection = () => {
  return (
    <div className="relative w-full">
      {/* Hero text */}
      <div className="relative z-10 flex h-[100vh] flex-col items-center justify-center gap-8 text-center">
        <h1 className="text-5xl font-extrabold text-white max-sm:px-10 xl:text-6xl">
          <FlipWords words={words} />
        </h1>

        <p className="w-1/2 text-3xl font-bold text-white max-sm:w-full max-sm:px-8 xl:text-2xl">
          We're a dev house, building <i>difficult-to-execute</i>, edge-tech
          projects for innovators across the globe.
        </p>

        <p className="absolute bottom-6 left-1/2 w-4/5 -translate-x-1/2 text-lg font-medium md:w-full md:text-xl">
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
      <div className="h-unset relative z-10 flex flex-col items-center justify-start gap-16 px-16 max-md:px-12 max-sm:px-4 sm:h-[90vh] sm:gap-8 lg:h-[70vh] xl:flex-row xl:justify-between">
        <div className="mb-0 mt-20 flex flex-[0.75] flex-col items-end justify-end text-left sm:mt-0 sm:gap-8 sm:text-right lg:mb-20 xl:mb-0">
          <h1 className="text-center text-3xl font-extrabold text-white sm:text-5xl lg:text-left">
            Paving the tech for the leading startups in the world.
          </h1>

          <p className="mx-auto mt-3 w-4/5 text-center text-sm text-white/80 sm:text-lg lg:w-full lg:text-left">
            We work in hyper-speed sprints to achieve edge tech solutions and
            deliver products that aims to beat competition.
          </p>
        </div>
        <div className="mb-20 flex flex-col sm:mb-0 sm:mt-20 lg:mt-0">
          <div className="flex items-center justify-center gap-10 sm:gap-12 md:gap-20 md:px-6">
            <div className="flex flex-col items-center justify-center gap-2">
              <span className="text-4xl font-black text-white sm:text-6xl">
                52+
              </span>
              {/* <span className="h-[0em] text-lg text-white/80 opacity-0">
                MVPs built
              </span> */}
            </div>

            <div className="flex flex-col items-center justify-center gap-2">
              <span className="text-4xl font-black text-white sm:text-6xl">
                6+
              </span>
              {/* <span className="h-[0em] text-lg text-white/80 opacity-0">
                Project Scaleups
              </span> */}
            </div>

            <div className="flex flex-col items-center justify-center gap-2">
              <span className="text-4xl font-black text-white sm:text-6xl">
                97%
              </span>
              {/* <span className="h-[0em] text-lg text-white/80 opacity-0">
                Clocked on Time
              </span> */}
            </div>
          </div>

          <div className="relative flex items-center justify-between gap-8 overflow-hidden rounded-[3em] px-6 py-3 backdrop-blur-xl before:absolute before:inset-0 before:animate-pump before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0 max-md:gap-12 max-sm:gap-8 sm:gap-0">
            <div className="relative z-10 flex flex-col gap-2">
              <span className="text-[10px] font-semibold text-white sm:text-lg">
                MVPs built
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-semibold text-white sm:text-lg">
                Project Scaleups
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-semibold text-white sm:text-lg">
                Clocked on Time
              </span>
            </div>
          </div>

          <Link
            href="/why-choose-us"
            className="text-md group relative mt-3 flex items-center gap-2 self-center font-bold text-white transition-colors hover:text-white md:self-end"
          >
            Six Reasons on why choose us
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
            <span className="absolute -bottom-2 left-[50%] h-[3px] bg-white opacity-0 group-hover:animate-border-line group-hover:opacity-100"></span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NewHeroSection;
