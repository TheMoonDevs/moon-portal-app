import React from 'react';
import OnboardingStep from './OnboardingStep';

const CopyAddress: React.FC<{ onNext: () => void; step: number }> = ({
  onNext,
  step,
}) => {
  return (
    <OnboardingStep
      image='/images/wallet.jpg'
      title='Find Your Wallet Address'
      subtitle='Copy the wallet address as shown in the image above.'
      onNext={onNext}
      step={step}
    >
      <p className='text-gray-300 text-xs px-4'>
        Go into Coinbase Wallet, click on{' '}
        <span className='text-orange-500'>Receive</span>, and then{' '}
        <span className='text-orange-500'>copy </span>
        any one of the wallet addresses provided.
      </p>
    </OnboardingStep>
  );
};

export default CopyAddress;
