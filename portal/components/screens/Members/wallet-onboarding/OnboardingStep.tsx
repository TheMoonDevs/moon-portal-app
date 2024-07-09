import Image from 'next/image';
import React from 'react';
import CircularProgress from '@mui/material/CircularProgress';

interface IOnboardingStepProps {
  image: string;
  title: string;
  subtitle: string;
  onNext: () => void;
  loading?: boolean;
  children?: React.ReactNode;
  step: number;
}

const OnboardingStep: React.FC<IOnboardingStepProps> = ({
  image,
  title,
  subtitle,
  loading,
  onNext,
  children,
  step,
}) => {
  return (
    <div className='flex flex-col items-center justify-between h-[calc(100vh-10vh)] p-6 py-7 w-[95%] md:w-[350px] lg:w-1/4 bg-neutral-800 shadow-md rounded-lg text-center'>
      {image && (
        <div className='relative w-44 h-44 rounded-full border-2 border-orange-500 flex items-center justify-center mb-6'>
          <Image
            src={image}
            alt='Step Image'
            fill
            className='rounded-full object-cover p-3'
          />
        </div>
      )}
      <div className=''>
        <h1 className='text-xl font-bold mb-2 text-white'>{title}</h1>
        <p className='text-sm text-gray-300 mb-4 px-2'>{subtitle}</p>
        <div>{children}</div>
      </div>
      <div className='rounded-full border-4 border-gray-200 flex items-center justify-center mt-4'>
        <button
          onClick={onNext}
          className=' bg-orange-500 rounded-full m-1 hover:bg-orange-600 transition flex items-center justify-center h-16 w-16 text-lg font-bold'
        >
          {loading ? (
            <CircularProgress size={24} color='inherit' />
          ) : (
            <span
              className='material-symbols-outlined text-gray-900 font-bold'
              style={{ fontSize: '2.25rem' }}
            >
              arrow_forward
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default OnboardingStep;
