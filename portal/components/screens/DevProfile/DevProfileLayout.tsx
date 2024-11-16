'use client';
import React, { useEffect, useState } from 'react';
import DetailsForm from './sections/DetailsForm';
import ExperienceForm from './sections/ExperienceForm';
import ProjectsForm from './sections/ProjectsForm';
import SkillsForm from './sections/SkillsForm';
import SocialLinksForm from './sections/SocialLinksForm';
import { useForm, FormProvider } from 'react-hook-form';
import { defaultValues, validateStepFields } from './sections';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { Spinner } from '@/components/elements/Loaders';
import StepperCompo from './sections/StepperCompo';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { stepDescriptions, steps } from '@/utils/constants/devProfileConstants';
import { toast } from 'sonner';

const stepComponents = [
  DetailsForm,
  ExperienceForm,
  ProjectsForm,
  SkillsForm,
  SocialLinksForm,
];

const DevProfileLayout = () => {
  const methods = useForm({
    defaultValues,
  });
  const { getValues, watch } = methods;
  const [activeStep, setActiveStep] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [isProfileFetching, setIsProfileFetching] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isButtonEnabled, setIsButtonEnabled] = useState<boolean>(false);
  const [creatingDevProfile, setCreatingDevProfile] = useState(false);
  const [isProfileUpdated, setIsProfileUpdated] = useState(false);
  const user = useUser();
  const {
    firstName,
    lastName,
    email,
    avatar,
    bio,
    address,
    city,
    state,
    country,
    profession,
    expertise,
    workExperience,
    projects,
    socialLinks,
  } = watch();

  const formValues = {
    firstName,
    lastName,
    email,
    avatar,
    bio,
    address,
    city,
    state,
    country,
    profession,
    expertise,
    workExperience,
    projects,
    socialLinks,
  };

  useEffect(() => {
    const isComplete =
      firstName &&
      lastName &&
      email &&
      avatar &&
      bio &&
      address &&
      city &&
      state &&
      country &&
      profession &&
      expertise.length > 0 &&
      workExperience.length > 0 &&
      projects.length > 0 &&
      socialLinks.length > 0;
    isComplete ? setIsButtonEnabled(true) : setIsButtonEnabled(false);
  }, [formValues]);

  const fetchDevProfile = async () => {
    setIsProfileFetching(true);
    try {
      const res = await PortalSdk.getData(
        `/api/dev-profile?userId=${user?.user?.id}`,
        null,
      );
      console.log(res);
      setProfile(res);
      if (res) {
        methods.reset(res);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsProfileFetching(false);
    }
  };

  useEffect(() => {
    if (user?.user?.id) {
      fetchDevProfile();
    }
  }, [user?.user?.id]);

  const handleStepChange = (newStep: number) => {
    const formData = getValues();
    validateStepFields(activeStep, formData);
    setTransitioning(true);
    setTimeout(() => {
      setActiveStep(newStep);
      setTransitioning(false);
    }, 200);
  };

  const handleCreateDevProfile = async () => {
    setCreatingDevProfile(true);
    try {
      const res = await PortalSdk.postData('/api/dev-profile', {
        userId: user?.user?.id,
        firstName,
        lastName,
        email,
        avatar,
        bio,
        address,
        city,
        state,
        country,
        profession,
        expertise,
        workExperience,
        projects,
        socialLinks,
      });
      setProfile(res);
      toast.success(
        isProfileUpdated
          ? 'Profile updated successfully!'
          : 'Profile created successfully!',
      );
    } catch (error) {
      toast.error('Error creating dev profile');
    } finally {
      setCreatingDevProfile(false);
    }
  };

  useEffect(() => {
    if (profile) {
      const fields = {
        firstName,
        lastName,
        email,
        avatar,
        bio,
        address,
        city,
        state,
        country,
        profession,
        expertise,
        workExperience,
        projects,
        socialLinks,
      };

      setIsProfileUpdated(
        (Object.keys(fields) as Array<keyof typeof fields>).some(
          (key) => JSON.stringify(fields[key]) !== JSON.stringify(profile[key]),
        ),
      );
    }
  }, [formValues]);

  return isProfileFetching || !user?.user?.id ? (
    <div className="flex h-full w-full items-center justify-center">
      <Spinner />
    </div>
  ) : (
    <div className="no-scrollbar flex h-full w-full items-start gap-2 overflow-y-scroll bg-[#F2F4F7] px-6 py-4 max-md:px-3 max-sm:flex-col max-sm:px-2">
      <div className="w-1/5 px-2 py-4 max-md:px-0 max-sm:w-full">
        <StepperCompo
          activeStep={activeStep}
          handleStepChange={handleStepChange}
        />
      </div>
      <div
        className={`relative h-full w-4/5 overflow-y-scroll rounded-lg bg-white px-4 pb-4 max-sm:w-full`}
      >
        <div
          className={`transition-all duration-300 ease-in-out ${
            transitioning
              ? 'translate-y-2 opacity-0'
              : 'translate-y-0 opacity-100'
          }`}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white">
            <div className="mb-4 py-4 pb-4">
              <h2 className="text-2xl font-semibold text-gray-800 max-sm:text-xl">
                {steps[activeStep].label}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {stepDescriptions[activeStep]}
              </p>
            </div>
            {!profile && (
              <button
                className={`cursor-pointer rounded-lg bg-black px-4 py-4 text-sm text-white transition duration-300 ease-in-out ${!isButtonEnabled || creatingDevProfile ? 'cursor-not-allowed bg-gray-300 text-gray-600' : ''}`}
                disabled={!isButtonEnabled || creatingDevProfile}
                onClick={handleCreateDevProfile}
              >
                {!creatingDevProfile ? (
                  'Create Dev Profile'
                ) : (
                  <span className="itemc-center flex justify-center gap-2 !text-gray-500">
                    Creating...
                    <Spinner className="h-4 w-4" />
                  </span>
                )}
              </button>
            )}
            {profile && isProfileUpdated && (
              <button
                className="cursor-pointer rounded-lg bg-black px-4 py-4 text-sm text-white transition duration-300 ease-in-out"
                onClick={handleCreateDevProfile}
              >
                Update Dev Profile
              </button>
            )}
          </div>
          <div className="rounded-lg bg-gray-50 p-4 shadow-inner">
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <FormProvider {...methods}>
                {React.createElement(stepComponents[activeStep])}
              </FormProvider>
            </LocalizationProvider>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevProfileLayout;
