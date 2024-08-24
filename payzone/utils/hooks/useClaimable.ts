import { useEffect, useState } from "react";
import { Contract } from "ethers";
import { useEthersProvider, useEthersSigner } from "./useEthers";
import { TOKEN_INFO } from "../constants/appInfo";
import TMDTokenABI from "@/utils/constants/erc20.json";

export function useClaimable() {
  const [isClaimable, setIsClaimable] = useState<boolean | null>(null);
  const [isSettingClaimable, setIsSettingClaimable] = useState(false);

  const provider = useEthersProvider();
  const signer = useEthersSigner();
  const getContract = new Contract(
    TOKEN_INFO.contractAddress,
    TMDTokenABI,
    provider
  );
  const postContract = new Contract(
    TOKEN_INFO.contractAddress,
    TMDTokenABI,
    signer
  );
  const getIsClaimable = async () => {
    try {
      const result = await getContract.getIsClaimable();
      // console.log(result);
      setIsClaimable(result);
    } catch (error) {
      console.error("Error fetching isClaimable:", error);
    }
  };

  const flipIsClaimable = async () => {
    try {
      setIsSettingClaimable(true);
      const result = await postContract.setIsClaimable(!isClaimable);
      console.log(result);
      // setIsClaimable(result);
      setIsSettingClaimable(false);
    } catch (error) {
      console.error("Error fetching isClaimable:", error);
    }
  };

  useEffect(() => {
    getIsClaimable();
  }, [provider]);

  return {
    isClaimable,
    isSettingClaimable,
    flipIsClaimable,
  };
}
