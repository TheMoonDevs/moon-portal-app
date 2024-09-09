import React, { useState } from "react";
import OnboardingStep from "./OnboardingStep";
import { toast, Toaster } from "sonner";
import { isValidEthAddress } from "@/utils/helpers/functions";

interface IStep3Props {
  onNext: (walletAddress: string) => void;
  loading: boolean;
  step: number;
}

const UploadWalletAddress: React.FC<IStep3Props> = ({
  onNext,
  loading,
  step,
}) => {
  const [walletAddress, setWalletAddress] = useState("");

  const handleNext = async () => {
    try {
      let address = walletAddress;
      if (!address) {
        const clipboardText = await navigator.clipboard.readText();
        address = clipboardText;
      }
      if (!isValidEthAddress(address)) {
        throw new Error("Invalid wallet address!");
      }
      setWalletAddress(address);
      onNext(address);
    } catch (error) {
      toast.error("Invalid wallet address!");
    }
  };

  return (
    <OnboardingStep
      image="/images/upload.svg"
      title="Upload Your Wallet Address"
      subtitle="Paste the copied wallet address below."
      loading={loading}
      onNext={handleNext}
      step={step}
    >
      <input
        type="text"
        value={walletAddress}
        onChange={(e) => setWalletAddress(e.target.value)}
        placeholder="Paste your wallet address"
        className="mt-4 p-3 rounded border border-gray-300 bg-gray-900 text-white w-full outline-none text-md"
      />
    </OnboardingStep>
  );
};

export default UploadWalletAddress;
