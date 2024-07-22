import React from 'react';
import OnboardingStep from './OnboardingStep';

const DownloadCoinbase: React.FC<{ onNext: () => void; step: number }> = ({
  onNext,
  step,
}) => {
  return (
    <OnboardingStep
      image='/images/coinbase.png'
      title='Please set up your wallet using Coinbase Wallet'
      subtitle='Download and set up Coinbase Wallet to get started.'
      onNext={onNext}
      step={step}
    >
      <a
        href='https://www.coinbase.com/wallet'
        target='_blank'
        rel='noopener noreferrer'
        className='text-[#1E90FF] hover:text-blue-500 transition flex items-center justify-center gap-1 text-xs'
      >
        Download Coinbase Wallet
        <span
          className='material-symbols-outlined'
          style={{ fontSize: '16px' }}
        >
          open_in_new
        </span>
      </a>
    </OnboardingStep>
  );
};

export default DownloadCoinbase;
