import { useMediaQuery } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';

import media from '@/styles/media';

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
  const [value, setValue] = useState(0);
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery(media.largeMobile);

  useEffect(() => {
    setValue(step * 33.33);
  }, [step]);

  const handleImageClick = () => {
    if (step === 2) {
      setOpen(true);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div className="no-scrollbar flex h-[calc(100vh-10vh)] w-[95%] flex-col items-center justify-between overflow-y-scroll rounded-lg bg-neutral-800 p-6 py-7 text-center shadow-md max-sm:size-full max-sm:justify-center max-sm:gap-8 md:w-[350px] lg:w-1/4">
      {image && (
        <div
          className={`relative mb-6 flex items-center justify-center max-sm:mt-8 ${
            step === 2
              ? 'h-auto w-full'
              : 'size-44 rounded-full border-2 border-[#1E90FF]'
          }`}
          // onClick={handleImageClick}
        >
          <Image
            src={image}
            alt="Step Image"
            {...(step !== 2 && { fill: true })}
            {...(step === 2 && {
              layout: 'responsive',
              width: isMobile ? 250 : 500,
              height: isMobile ? 250 : 500,
            })}
            className={`object-cover p-3 ${
              step === 2 ? 'rounded-sm' : 'rounded-full'
            }`}
          />
        </div>
      )}
      <div className="">
        <h1 className="mb-2 text-xl font-bold text-white">{title}</h1>
        <p className="mb-4 px-2 text-sm text-gray-300">{subtitle}</p>
        <div>{children}</div>
      </div>
      <div
        className={`circular-progress-button ${step === 2 && 'mt-6'}`}
        style={{ '--value': value } as React.CSSProperties}
      >
        <button
          onClick={onNext}
          className={`m-2 flex size-16 items-center justify-center rounded-full bg-[#1E90FF] text-lg font-bold transition hover:bg-blue-600`}
        >
          {loading ? (
            <CircularProgress size={24} sx={{ color: '#fff' }} />
          ) : (
            <span
              className="material-symbols-outlined font-bold text-gray-900"
              style={{ fontSize: '2.25rem' }}
            >
              arrow_forward
            </span>
          )}
        </button>
      </div>
      {/* <Dialog open={open} onClose={handleClose}>
        <DialogContent>
          <div className='relative'>
            <IconButton
              aria-label='close'
              onClick={handleClose}
              style={{
                position: 'absolute',
                right: 8,
                top: 8,
                background: '#ababab',
              }}
            >
              <span className='material-symbols-outlined'>close</span>
            </IconButton>
            <Image
              src={image}
              alt=''
              layout='responsive'
              width={500}
              height={500}
            />
          </div>
        </DialogContent>
      </Dialog> */}
    </div>
  );
};

export default OnboardingStep;
