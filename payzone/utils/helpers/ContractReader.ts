import {
  Address,
  createPublicClient,
  http,
  createWalletClient,
  parseEther,
} from "viem";
import { base, baseSepolia, bscTestnet } from "viem/chains";
import { chainEnum } from "../constants/appInfo";

interface Contract {
  chain: chainEnum;
  address: Address;
  abi: any[];
}
export const readContractData = async (
  contract: Contract,
  functionName: string,
  walletAddress: Address
): Promise<any> => {
  const chain =
    contract.chain === chainEnum.baseSepolia
      ? baseSepolia
      : contract.chain === chainEnum.base
      ? base
      : base;
  const client = createPublicClient({
    chain: chain,
    transport: http(),
  });

  return await client.readContract({
    address: contract.address,
    abi: contract.abi,
    functionName: functionName,
    args: [walletAddress],
  });
};
