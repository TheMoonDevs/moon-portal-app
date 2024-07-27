import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import { useMediaQuery } from '@mui/material';
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
    <div className='flex flex-col items-center justify-between h-[calc(100vh-10vh)] p-6 py-7 w-[95%] md:w-[350px] lg:w-1/4 bg-neutral-800 shadow-md rounded-lg text-center max-sm:w-full max-sm:h-full max-sm:justify-center max-sm:gap-8 overflow-y-scroll no-scrollbar'>
      {image && (
        <div
          className={`relative flex items-center justify-center mb-6 max-sm:mt-8 ${
            step === 2
              ? 'w-full h-auto'
              : 'w-44 h-44 rounded-full border-2 border-[#1E90FF]'
          }`}
          // onClick={handleImageClick}
        >
          <Image
            src={image}
            alt='Step Image'
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
      <div className=''>
        <h1 className='text-xl font-bold mb-2 text-white'>{title}</h1>
        <p className='text-sm text-gray-300 mb-4 px-2'>{subtitle}</p>
        <div>{children}</div>
      </div>
      <div
        className={`circular-progress-button ${step === 2 && 'mt-6'}`}
        style={{ '--value': value } as React.CSSProperties}
      >
        <button
          onClick={onNext}
          className={`bg-[#1E90FF] rounded-full m-2 hover:bg-blue-600 transition flex items-center justify-center h-16 w-16 text-lg font-bold `}
        >
          {loading ? (
            <CircularProgress size={24} sx={{ color: '#fff' }} />
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
