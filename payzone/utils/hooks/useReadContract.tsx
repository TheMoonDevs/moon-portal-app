import { useEffect, useState } from "react";

import { Address, formatUnits } from "viem";
import { readContractData } from "../helpers/ContractReader";
import { useWallet } from "./useWallet";
import { useAppSelector } from "../redux/store";
import { useAuthSession } from "./useAuthSession";
import { chainEnum } from "../constants/appInfo";
import { useEthersProvider } from "./useEthers";
import { Contract as EthersContract } from "ethers";

interface Contract {
  chain: chainEnum;
  address: Address;
  abi: any[];
}

interface TokenData {
  totalSupply?: number;
  circulatingSupply?: number;
  balance: number;
}

const useReadContract = (contract: Contract): TokenData => {
  const [tokenData, setTokenData] = useState<TokenData>({
    totalSupply: 0,
    circulatingSupply: 0,
    balance: 0,
  });
  const { user } = useAuthSession();

  const provider = useEthersProvider();

  const getContract = new EthersContract(
    contract.address,
    contract.abi,
    provider
  );
  const getBalance = async (wallet: string) => {
    return getContract.balanceOf(wallet);
  };

  const walletAddress = (user?.payData as any)?.walletAddress;

  useEffect(() => {
    const getData = async () => {
      // const totalSupply = await readContractData(contract, "totalSupply");
      // const totalBurnedAmount = await readContractData(contract, "totalBurnedAmount");
      //console.log("walletAddress", walletAddress);
      if (!walletAddress) return;
      // const balance = await readContractData(
      //   contract,
      //   "balanceOf",
      //   walletAddress
      // );
      const balance = await getBalance(walletAddress);

      setTokenData((prev) => ({ ...prev, balance: balance }));
    };

    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  return tokenData;
};

export default useReadContract;
