/* eslint-disable @next/next/no-img-element */
'use client';
import Image from 'next/image';
import React from 'react';
import ToolTip from '../Global/ToolTip';

const CustomBotsHero = () => {
  return (
    <div className='relative w-full'>
      <div className='absolute top-0 left-0 w-full h-full z-0'>
        <Image
          src='/images/customBotsHero.png'
          alt='hero'
          className='w-full h-full object-cover'
          fill
          loading='lazy'
        />
      </div>
      <div className='relative z-10 h-[100vh] py-28 px-8 flex flex-col  gap-4 max-sm:px-4 '>
        <div className='flex'>
          <h1 className='  text-white text-4xl font-extrabold text-end '>
            Enter the new age <br />
            of Ai-first, custom made,
            <br /> social bots
          </h1>
        </div>
        <div className=' flex gap-8 max-sm:flex-col '>
          <p className='text-lg  text-start '>
            Connect your App, Social Platforms,
            <br /> and the 100s of Saas tools you use to <br /> manage your
            business all in 1 place - with <br /> custom branded social bots
            that report to <br /> you or your community or your required
            <br /> place.{' '}
          </p>
          <div className='flex items-center gap-4 '>
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
        </div>
      </div>
      <div className='relative z-10 px-12 flex flex-row gap-2 top-16 max-sm:px-4 max-sm:top-0'>
        <ToolTip title='lorem ipsum'>
          <img
            src='/filled-icons/slack.svg'
            alt=''
            className='cursor-pointer mt-48 h-16 w-16 max-sm:h-10 max-sm:w-10'
          />
        </ToolTip>
        <ToolTip title='Connect lorem ipsum'>
          <img
            src='/filled-icons/X.svg'
            alt=''
            className='cursor-pointer mt-20  h-14 w-14 max-sm:h-12 max-sm:w-12'
          />
        </ToolTip>
        <ToolTip title='Connect lorem ipsum'>
          <img
            src='/filled-icons/discord.svg'
            alt=''
            className='cursor-pointer mt-56 h-24 w-24 max-sm:h-16 max-sm:w-16'
          />
        </ToolTip>
        <ToolTip title='lorem ipsum'>
          <img
            src='/filled-icons/google.svg'
            alt=''
            className='cursor-pointer mt-32 h-14 w-14 max-sm:h-12 max-sm:w-12'
          />
        </ToolTip>
        <ToolTip title='lorem ipsum'>
          <img
            src='/filled-icons/WP.svg'
            alt=''
            className='cursor-pointer mt-8 h-14 w-14 max-sm:h-12 max-sm:w-12'
          />
        </ToolTip>
        <ToolTip title='lorem ipsum'>
          <img
            src='/filled-icons/telegram.svg'
            alt=''
            className='cursor-pointer mt-32 h-14 w-14 max-sm:h-12 max-sm:w-12'
          />
        </ToolTip>
      </div>
      <div className='relative z-10 flex justify-end '>
        <div className='py-24  px-12 flex flex-col items-start gap-6  max-sm:px-4'>
          <h1 className='text-4xl font-bold'>
            Designed & Built <br />
            specific to your case.
          </h1>
          <p className='text-lg'>
            Get InApp Integrations or 3rdParty tool <br /> integrations done in
            a flash & free of cost. <br /> We can do this thanks to our large
            repo trained <br /> AI bots which support hyperspeed coding social{' '}
            <br /> bots.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomBotsHero;
