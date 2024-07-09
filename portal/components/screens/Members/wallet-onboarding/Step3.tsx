import React, { useState } from 'react';
import OnboardingStep from './OnboardingStep';

interface IStep3Props {
  onNext: (walletAddress: string) => void;
  loading: boolean;
  step: number;
}

const UploadAddress: React.FC<IStep3Props> = ({ onNext, loading, step }) => {
  const [walletAddress, setWalletAddress] = useState('');

  const handleNext = async () => {
    if (!walletAddress) {
      try {
        const clipboardText = await navigator.clipboard.readText();
        setWalletAddress(clipboardText);
        onNext(clipboardText);
      } catch (error) {
        console.error('Failed to read clipboard content: ', error);
      }
    } else {
      onNext(walletAddress);
    }
  };

  return (
    <OnboardingStep
      image='/images/upload.svg'
      title='Upload Your Wallet Address'
      subtitle='Paste the copied wallet address below.'
      loading={loading}
      onNext={handleNext}
      step={step}
    >
      <input
        type='text'
        value={walletAddress}
        onChange={(e) => setWalletAddress(e.target.value)}
        placeholder='Paste your wallet address'
        className='mt-4 p-3 rounded border border-gray-300 bg-gray-900 text-white w-full outline-none text-md'
      />
    </OnboardingStep>
  );
};

export default UploadAddress;
