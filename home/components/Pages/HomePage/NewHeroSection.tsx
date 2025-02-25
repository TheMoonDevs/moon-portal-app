import { FlipWords } from '@/components/ui/flip-words';
import { Mrs_Sheppards } from 'next/font/google';
import Image from 'next/image';
import React from 'react';

const words = ['Live', 'Think', 'Build', 'Unleash'];
const mrsSheppard = Mrs_Sheppards({ weight: '400', subsets: ['latin'] });
const NewHeroSection = () => {
  return (
    <div className="relative w-full">
      {/* Image section */}
      <div className="absolute left-0 top-0 z-0 h-full w-full">
        <Image
          src="/images/hero.png"
          alt="hero"
          className="h-full w-full object-cover"
          fill
          loading="lazy"
        />
      </div>

      {/* Hero text */}
      <div className="relative z-10 flex h-[100vh] flex-col items-center justify-center gap-8 text-center">
        <h1 className="text-5xl font-extrabold text-white max-sm:px-10">
          <FlipWords words={words} /> your Tech Dream
        </h1>

        <p className="w-1/2 text-2xl font-medium text-white max-sm:w-full max-sm:px-8">
          Get world class developers & software engineers help you build your
          difficult-to-execute Idea/aspirations.
        </p>

        <p className="absolute bottom-6 left-1/2 w-full -translate-x-1/2 text-xl font-normal">
          The
          <span
            className={`${mrsSheppard.className} black mx-3 mt-6 text-4xl text-white`}
          >
            #1
          </span>
          destination to build market-ready MVPs across the globe.
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
        <div className="flex w-full items-center justify-center p-12 text-3xl font-extrabold text-white max-md:p-8">
          Hero Section Footer
        </div>
      </div>
    </div>
  );
};

export default NewHeroSection;
