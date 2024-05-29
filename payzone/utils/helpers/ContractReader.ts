import {
  Address,
  createPublicClient,
  http,
  createWalletClient,
  parseEther,
} from "viem";
import { bscTestnet } from "viem/chains";

interface Contract {
  address: Address;
  abi: any[];
}
export const readContractData = async (
  contract: Contract,
  functionName: string,
  walletAddress: Address
): Promise<any> => {
  const chain = bscTestnet;
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
