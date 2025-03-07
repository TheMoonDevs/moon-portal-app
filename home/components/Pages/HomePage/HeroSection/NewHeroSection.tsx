import { FlipWords } from '@/components/ui/flip-words';
import { Mrs_Sheppards } from 'next/font/google';
import Image from 'next/image';
import React from 'react';

const words = ['Scale', 'Think', 'Build'];
const mrsSheppard = Mrs_Sheppards({ weight: '400', subsets: ['latin'] });
const NewHeroSection = () => {
  return (
    <div className="relative w-full">
      {/* Hero text */}
      <div className="relative z-10 flex h-[100vh] flex-col items-center justify-center gap-8 text-center">
        <h1 className="text-5xl xl:text-6xl font-extrabold text-white max-sm:px-10">
          <FlipWords words={words} /> your vision
        </h1>

        <p className="w-1/2 text-2xl xl:text-2xl font-bold text-white max-sm:w-full max-sm:px-8">
          We're a dev house, building <i>difficult-to-execute</i>, edge-tech projects for innovators across the globe.
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
      <div className="relative z-10 flex flex-col">
        <h1 className="flex w-1/2 items-end justify-end px-16 text-end text-5xl font-extrabold text-white max-md:w-[80%] max-md:px-12 max-sm:w-full max-sm:px-4">
          Paving the tech for the leading startups in the world.
        </h1>
      </div>
      <div className="relative z-10 flex flex-col items-center gap-16 py-16 max-md:gap-12 max-sm:items-start max-sm:gap-8 max-sm:py-12">
        <p className="flex w-1/4 flex-col gap-4 text-lg font-medium text-white max-md:w-1/2 max-sm:w-full max-sm:px-4">
          <span>
            Innovation is the name of our game. We work in hyper-speed sprints
            to achieve edge tech solutions and deliver products that aim to beat
            the competition.
          </span>
          <span>We strive to excel.</span>
        </p>
        <div className="flex items-center gap-4 max-sm:px-4">
          <button
            className="rounded-2xl bg-black px-4 py-2 font-medium"
            style={{ border: '2px solid black' }}
          >
            Start Trial
          </button>
          <button
            className="rounded-2xl px-4 py-2 font-medium"
            style={{ border: '2px solid white' }}
          >
            View Demo
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewHeroSection;
