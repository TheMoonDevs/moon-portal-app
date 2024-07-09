'use client';
import React, { useState } from 'react';
import { PageAccess } from '@/components/global/PageAccess';
import Step1 from '@/components/screens/Members/wallet-onboarding/Step1';
import Step2 from '@/components/screens/Members/wallet-onboarding/Step2';
import Step3 from '@/components/screens/Members/wallet-onboarding/Step3';
import { useRouter } from 'next/navigation';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { useAppSelector } from '@/utils/redux/store';
import { Snackbar, Alert } from '@mui/material';

const CreateWalletPage = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const user = useAppSelector((state) => state.auth.user);
  const router = useRouter();

  const handleNextStep = async (walletAddress?: string) => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      if (walletAddress) {
        setLoading(true);
        try {
          const response = await PortalSdk.putData('/api/user', {
            ...user,
            payData: {
              walletAddress: walletAddress,
            },
          });
          console.log('API response:', response);
          setSnackbarMessage(
            'Wallet address successfully updated. Redirecting to homepage...'
          );
          setShowSnackbar(true);
          setTimeout(() => {
            router.push(APP_ROUTES.home);
          }, 3000);
        } catch (error) {
          console.error('Error uploading wallet address:', error);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  return (
    <PageAccess isAuthRequired={true}>
      <div className='py-2 bg-neutral-900 h-screen flex items-center justify-center'>
        {step === 1 && <Step1 onNext={() => handleNextStep()} step={step} />}
        {step === 2 && <Step2 onNext={() => handleNextStep()} step={step} />}
        {step === 3 && (
          <Step3
            onNext={(walletAddress) => handleNextStep(walletAddress)}
            loading={loading}
            step={step}
          />
        )}
      </div>
      <Snackbar
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={() => setShowSnackbar(false)}
      >
        <Alert onClose={() => setShowSnackbar(false)} severity='success'>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </PageAccess>
  );
};

export default CreateWalletPage;
