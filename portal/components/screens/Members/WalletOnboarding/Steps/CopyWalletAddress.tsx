import React from "react";
import OnboardingStep from "./OnboardingStep";

const CopyWalletAddress: React.FC<{ onNext: () => void; step: number }> = ({
  onNext,
  step,
}) => {
  return (
    <OnboardingStep
      image="/images/wallet.jpg"
      title="Find Your Wallet Address"
      subtitle=""
      onNext={onNext}
      step={step}
    >
      <p className="text-gray-300 text-xs px-4">
        Go into Coinbase Wallet, click on the{" "}
        <span className="text-[#1E90FF]">copy</span> icon at the{" "}
        <span className="text-[#1E90FF]">top</span> beside the addresses, and
        then <span className="text-[#1E90FF]">copy</span> the Ethereum address
        by{" "}
        <span className="text-[#1E90FF]">
          clicking on the icon next to Ethereum.
        </span>
      </p>
    </OnboardingStep>
  );
};

export default CopyWalletAddress;
