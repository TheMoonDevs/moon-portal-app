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
      subtitle="Click on the above image to see the full image."
      onNext={onNext}
      step={step}
    >
      <p className="text-gray-300 text-xs px-4">
        Go into Coinbase Wallet, click on the{" "}
        <span className="text-orange-500">copy</span> icon at the{" "}
        <span className="text-orange-500">top</span> beside the addresses, and
        then <span className="text-orange-500">copy</span> the Ethereum address
        by{" "}
        <span className="text-orange-500">
          clicking on the icon next to Ethereum.
        </span>
      </p>
    </OnboardingStep>
  );
};

export default CopyWalletAddress;
