'use client ';
import React from 'react';
import { Step, StepLabel, Stepper, useMediaQuery } from '@mui/material';
import { steps } from '@/utils/constants/devProfileConstants';
import media from '@/styles/media';

const StepperCompo = ({
  activeStep,
  handleStepChange,
}: {
  activeStep: number;
  handleStepChange: (step: number) => void;
}) => {
  const isMobile = useMediaQuery(media.largeMobile);
  return (
    <div>
      <Stepper
        activeStep={activeStep}
        orientation={!isMobile ? 'vertical' : 'horizontal'}
        className="w-full"
        sx={{
          '& .MuiStepConnector-root': {
            ml: '20px',
          },
        }}
      >
        {steps.map((step, index) => (
          <Step
            key={step.label}
            active={index === activeStep}
            className="flex items-center"
          >
            <StepLabel
              onClick={() => handleStepChange(index)}
              className="flex !cursor-pointer items-center text-gray-700 transition duration-300 hover:text-gray-900"
              StepIconComponent={() => (
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    index === activeStep
                      ? 'bg-gray-300 text-gray-600'
                      : 'bg-gray-100 text-gray-800'
                  } transition-all duration-300 ease-in-out`}
                >
                  <span
                    className={`material-symbols-outlined text-lg ${
                      index === activeStep ? 'font-semibold' : ''
                    }`}
                  >
                    {step.icon}
                  </span>
                </div>
              )}
            >
              <span
                className={`text-lg ${
                  index === activeStep
                    ? 'font-semibold text-gray-800'
                    : 'text-gray-600'
                } max-sm:hidden`}
              >
                {step.label}
              </span>
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </div>
  );
};

export default StepperCompo;
