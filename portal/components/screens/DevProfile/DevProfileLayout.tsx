'use client';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import DetailsForm from './sections/DetailsForm';
import ExperienceForm from './sections/ExperienceForm';
import ProjectsForm from './sections/ProjectsForm';
import SkillsForm from './sections/SkillsForm';
import SocialLinksForm from './sections/SocialLinksForm';
import { useForm, FormProvider } from 'react-hook-form';
import {
  areAllFieldsFilled,
  defaultValues,
  validateStepFields,
} from './sections';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { Spinner } from '@/components/elements/Loaders';
import StepperCompo from './sections/StepperCompo';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { stepDescriptions, steps } from '@/utils/constants/devProfileConstants';
import { toast } from 'sonner';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { DevProfile } from '@prisma/client';

const DevProfileLayout = () => {
  const methods = useForm({
    defaultValues,
  });
  const { getValues, handleSubmit } = methods;
  const [activeStep, setActiveStep] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [isProfileFetching, setIsProfileFetching] = useState(false);
  const [profile, setProfile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const user = useUser();

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
    const isStepFieldsFilled = validateStepFields(activeStep, formData, true);

    const profileStepData = profile
      ? validateStepFields(activeStep, profile, true)
      : null;

    const hasUnsavedChanges =
      isStepFieldsFilled &&
      (!profileStepData ||
        JSON.stringify(validateStepFields(activeStep, formData, true)) !==
          JSON.stringify(profileStepData));

    if (hasUnsavedChanges) {
      // toast.error('You have unsaved changes! Save them before proceeding.', {
      //   action: {
      //     label: 'Save & Continue',
      //     onClick: () => handleSaveAndProceed(newStep),
      //   },
      //   cancel: {
      //     label: 'Cancel',
      //     onClick: () => toast.dismiss(),
      //   },
      // });
      setOpenModal(true);
      return;
    }

    proceedToStep(newStep);
  };

  const proceedToStep = (newStep: number) => {
    setTransitioning(true);
    setTimeout(() => {
      setActiveStep(newStep);
      setTransitioning(false);
    }, 200);
  };

  const handleSaveAndProceed = async (
    newStep: number | null,
    data: DevProfile,
  ) => {
    setUploading(true);
    // const formValues = getValues();
    const { id, createdAt, updatedAt, ...filteredFormData } = data;

    const changes = Object.entries(filteredFormData).reduce(
      (acc, [key, value]) => {
        if (
          JSON.stringify(profile?.[key as keyof typeof profile]) !==
          JSON.stringify(value)
        ) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, unknown>,
    );

    if (Object.keys(changes).length === 0) {
      toast.info('No changes to save.');
      if (newStep !== null) {
        proceedToStep(newStep);
      }
      return;
    }

    const payload = profile
      ? {
          ...(profile as Record<string, unknown>),
          ...changes,
          id: undefined,
          createdAt: undefined,
          updatedAt: undefined,
          userId: user?.user?.id,
        }
      : { ...filteredFormData, userId: user?.user?.id };

    try {
      const res = await PortalSdk.postData('/api/dev-profile', payload);
      toast.success('Profile saved successfully');
      setProfile(res);
      if (!areAllFieldsFilled(data)) {
        if (newStep !== null) {
          proceedToStep(newStep);
        }
      }
    } catch (error) {
      console.error('Save Error:', error);
      toast.error('Failed to save changes. Please try again.');
    } finally {
      setUploading(false);
    }
    setOpenModal(false);
  };

  useEffect(() => {
    if (profile && areAllFieldsFilled(getValues())) {
      setShowUpdate(true);
    }
  }, [activeStep, methods]);

  const handleForm = (data: DevProfile) => {
    activeStep === steps.length - 1
      ? handleSaveAndProceed(null, data)
      : handleSaveAndProceed(activeStep + 1, data);
  };

  return isProfileFetching || !user?.user?.id ? (
    <div className="flex h-full w-full items-center justify-center">
      <Spinner />
    </div>
  ) : (
    <>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(handleForm)}>
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
                  <button
                    onClick={(e) => {
                      // activeStep === steps.length - 1
                      //   ? handleSaveAndProceed(null)
                      //   : handleSaveAndProceed(activeStep + 1)
                      e.preventDefault();
                    }}
                    className={`cursor-pointer rounded-lg bg-black px-4 py-2 text-sm text-white transition duration-300 ease-in-out ${transitioning && 'cursor-not-allowed opacity-50'}`}
                    disabled={transitioning}
                    type="submit"
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center gap-2">
                        Saving... <Spinner className="h-4 w-4" />
                      </span>
                    ) : showUpdate ? (
                      'Update'
                    ) : activeStep === steps.length - 1 ? (
                      'Submit'
                    ) : (
                      'Save & Continue'
                    )}
                  </button>
                </div>
                <div className="rounded-lg bg-gray-50 p-4 shadow-inner">
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    {activeStep === 0 && (
                      <DetailsForm
                        // handleSaveAndProceed={handleSaveAndProceed}
                        methods={methods}
                      />
                    )}
                    {activeStep === 1 && <ExperienceForm />}
                    {activeStep === 2 && <ProjectsForm />}
                    {activeStep === 3 && <SkillsForm />}
                    {activeStep === 4 && <SocialLinksForm />}
                  </LocalizationProvider>
                </div>
              </div>
            </div>
          </div>
        </form>
      </FormProvider>
      <Modal
        openModal={openModal}
        setOpenModal={setOpenModal}
        handleSaveAndProceed={handleSaveAndProceed}
        activeStep={activeStep}
        data={getValues()}
        uploading={uploading}
      />
    </>
  );
};

export default DevProfileLayout;

const Modal = ({
  openModal,
  setOpenModal,
  handleSaveAndProceed,
  activeStep,
  uploading,
  data,
}: {
  openModal: boolean;
  setOpenModal: Dispatch<SetStateAction<boolean>>;
  handleSaveAndProceed: (newStep: number | null, data: DevProfile) => void;
  activeStep: number;
  uploading: boolean;
  data: DevProfile;
}) => {
  return (
    <Dialog
      open={openModal}
      onClose={() => setOpenModal(false)}
      fullWidth
      maxWidth="sm"
      className="rounded-lg shadow-lg"
    >
      <DialogTitle className="text-xl font-semibold text-gray-800">
        Unsaved Changes
      </DialogTitle>
      <DialogContent className="text-sm text-gray-600">
        <p>
          You have unsaved changes! Do you want to save them before proceeding?
        </p>
      </DialogContent>
      <DialogActions className="gap-2 p-4">
        <button
          onClick={() => setOpenModal(false)}
          className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors duration-300 ease-in-out hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            handleSaveAndProceed(activeStep + 1, data);
          }}
          className="cursor-pointer rounded-lg bg-black px-4 py-2 text-sm text-white transition-colors duration-300 ease-in-out hover:bg-gray-800"
        >
          {uploading ? (
            <>
              <span className="flex items-center justify-center gap-2">
                Saving
                <Spinner className="h-4 w-4" />
              </span>
            </>
          ) : (
            'Save & Continue'
          )}
        </button>
      </DialogActions>
    </Dialog>
  );
};
