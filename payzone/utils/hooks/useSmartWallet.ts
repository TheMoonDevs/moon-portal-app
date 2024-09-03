import { useAccount } from "wagmi";
import { useCapabilities, useWriteContracts } from "wagmi/experimental";
import { useState, useMemo } from "react";
import { TOKEN_INFO } from "@/utils/constants/appInfo";
import { WalletCapabilities } from "viem";

export const useSmartWallet = () => {
  const { connector } = useAccount();
  const account = useAccount();

  const [id, setId] = useState<string | undefined>(undefined);
  const { writeContractsAsync } = useWriteContracts({
    mutation: { onSuccess: (id) => setId(id) },
  });

  const isCoinbaseConnection = connector?.id === "coinbaseWalletSDK";
  const { data: availableCapabilities } = isCoinbaseConnection
    ? useCapabilities({
        account: account.address,
      })
    : ({} as WalletCapabilities);
  const capabilities = useMemo(() => {
    if (!isCoinbaseConnection || !availableCapabilities || !account.chainId)
      return {};
    const capabilitiesForChain = availableCapabilities[account.chainId];
    if (
      capabilitiesForChain["paymasterService"] &&
      capabilitiesForChain["paymasterService"].supported
    ) {
      return {
        paymasterService: {
          url: `${document.location.origin}/api/paymaster/`,
        },
      };
    }
    return {};
  }, [availableCapabilities, account.chainId, isCoinbaseConnection]);

  const mint = async (address: string, amount: bigint) => {
    if (!isCoinbaseConnection) return null;

    return writeContractsAsync({
      contracts: [
        {
          address: TOKEN_INFO.contractAddress as `0x${string}`,
          abi: [
            {
              inputs: [
                { internalType: "address", name: "to", type: "address" },
                { internalType: "uint256", name: "amount", type: "uint256" },
              ],
              name: "reward",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
          ],
          functionName: "reward",
          args: [address, amount],
        },
      ],
      capabilities,
    });
  };

  const claim = async (amount: bigint) => {
    if (!isCoinbaseConnection) return null;

    return writeContractsAsync({
      contracts: [
        {
          address: TOKEN_INFO.contractAddress as `0x${string}`,
          abi: [
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "amount",
                  type: "uint256",
                },
              ],
              name: "claim",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
          ],
          functionName: "claim",
          args: [amount],
        },
      ],
      capabilities,
    });
  };

  const transfer = async (to: string, amount: bigint) => {
    if (!isCoinbaseConnection) return null;

    return writeContractsAsync({
      contracts: [
        {
          address: TOKEN_INFO.contractAddress as `0x${string}`,
          abi: [
            {
              inputs: [
                { internalType: "address", name: "to", type: "address" },
                { internalType: "uint256", name: "amount", type: "uint256" },
              ],
              name: "transfer",
              outputs: [{ internalType: "bool", name: "", type: "bool" }],
              stateMutability: "nonpayable",
              type: "function",
            },
          ],
          functionName: "transfer",
          args: [to, amount],
        },
      ],
      capabilities,
    });
  };
  const setClaimable = async (value: boolean) => {
    if (!isCoinbaseConnection) return;
    return writeContractsAsync({
      contracts: [
        {
          address: TOKEN_INFO.contractAddress as `0x${string}`,
          abi: [
            {
              inputs: [
                {
                  internalType: "bool",
                  name: "_isClaimable",
                  type: "bool",
                },
              ],
              name: "setIsClaimable",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
          ],
          functionName: "setIsClaimable",
          args: [value],
        },
      ],
      capabilities,
    });
  };
  return {
    isCoinbaseConnection,
    mint,
    claim,
    transfer,
    setClaimable,
  };
};
