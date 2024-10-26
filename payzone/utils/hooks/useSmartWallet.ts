import { useAccount } from "wagmi";
import { useCapabilities, useWriteContracts } from "wagmi/experimental";
import { useState, useMemo, useEffect } from "react";
import { TOKEN_INFO } from "@/utils/constants/appInfo";
import { WalletCapabilities } from "viem";

export const useSmartWallet = () => {
  const { connector, address, chainId } = useAccount();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [id, setId] = useState<string | undefined>(undefined);
  const { writeContractsAsync } = useWriteContracts({
    mutation: { onSuccess: (id) => setId(id) },
  });

  const isCoinbaseConnection = connector?.id === "coinbaseWalletSDK";

  const { data: availableCapabilities, isError: isCapabilitiesError } =
    useCapabilities({
      account: address,
    });

  useEffect(() => {
    if (isCapabilitiesError) {
      setError("Error fetching wallet capabilities");
    } else {
      setError(null);
    }
  }, [isCapabilitiesError]);

  useEffect(() => {
    if (connector && address && chainId) {
      setIsInitialized(true);
    } else {
      setIsInitialized(false);
    }
  }, [connector, address, chainId]);

  const capabilities = useMemo(() => {
    if (!isCoinbaseConnection || !availableCapabilities || !chainId) return {};
    const capabilitiesForChain = availableCapabilities[chainId];
    if (
      capabilitiesForChain?.["paymasterService"] &&
      capabilitiesForChain["paymasterService"]?.supported
    ) {
      return {
        paymasterService: {
          url: `${document.location.origin}/api/paymaster/`,
        },
      };
    }
    return {};
  }, [availableCapabilities, chainId, isCoinbaseConnection]);

  const executeSmartWalletFunction = async (
    functionName: string,
    abi: any[],
    args: any[]
  ) => {
    if (!isCoinbaseConnection || !isInitialized) {
      console.warn(
        `Cannot execute ${functionName}: Not a Coinbase connection or not initialized`
      );
      return null;
    }

    try {
      return await writeContractsAsync({
        contracts: [
          {
            address: TOKEN_INFO.contractAddress as `0x${string}`,
            abi,
            functionName,
            args,
          },
        ],
        capabilities,
      });
    } catch (err) {
      console.error(`Error executing ${functionName}:`, err);
      setError(`Failed to execute ${functionName}`);
      return null;
    }
  };

  const mint = (address: string, amount: bigint) =>
    executeSmartWalletFunction(
      "reward",
      [
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
      [address, amount]
    );

  const claim = (amount: bigint) =>
    executeSmartWalletFunction(
      "claim",
      [
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
      [amount]
    );

  const transfer = (to: string, amount: bigint) =>
    executeSmartWalletFunction(
      "transfer",
      [
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
      [to, amount]
    );

  const setClaimable = (value: boolean) =>
    executeSmartWalletFunction(
      "setIsClaimable",
      [
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
      [value]
    );

  return {
    isCoinbaseConnection,
    isInitialized,
    error,
    mint,
    claim,
    transfer,
    setClaimable,
  };
};
