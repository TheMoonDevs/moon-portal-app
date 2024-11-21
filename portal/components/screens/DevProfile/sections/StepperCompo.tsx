'use client ';
import React from 'react';
import { Step, StepLabel, Stepper, useMediaQuery } from '@mui/material';
import { steps } from '@/utils/constants/devProfileConstants';
import media from '@/styles/media';
import { useFormContext } from 'react-hook-form';
import { validateStepFields } from '.';
import { DevProfile } from '@prisma/client';

const StepperCompo = ({
  activeStep,
  handleStepChange,
}: {
  activeStep: number;
  handleStepChange: (step: number) => void;
}) => {
  const isMobile = useMediaQuery(media.largeMobile);
  const { getValues } = useFormContext();
  const formData = getValues();

  const getStepStatus = (stepIndex: number) => {
    const isValid = validateStepFields(stepIndex, formData as DevProfile, true);
    return isValid ? 'completed' : 'incomplete';
  };

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
              StepIconComponent={() =>
                !isMobile ? (
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
                ) : (
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold ${
                      getStepStatus(index) === 'completed'
                        ? 'border border-green-600 bg-green-100 text-green-600'
                        : getStepStatus(index) === 'incomplete'
                          ? 'border border-yellow-600 bg-yellow-100 text-yellow-600'
                          : 'border border-gray-600 bg-gray-100 text-gray-600'
                    } transition-all duration-300 ease-in-out`}
                  >
                    {getStepStatus(index) === 'completed' ? '✔' : index + 1}
                  </div>
                )
              }
            >
              <span
                className={`text-lg ${
                  index === activeStep
                    ? 'font-semibold text-gray-800'
                    : 'text-gray-600'
                } flex items-center gap-2 max-md:text-base max-sm:hidden`}
              >
                {step.label}
                <span
                  className={`material-symbols-outlined text-lg max-md:text-base ${
                    getStepStatus(index) === 'completed'
                      ? 'font-semibold text-green-500'
                      : 'text-gray-600'
                  }`}
                >
                  {getStepStatus(index) === 'completed'
                    ? 'check_circle'
                    : 'error'}
                </span>
              </span>
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </div>
  );
};

export default StepperCompo;
