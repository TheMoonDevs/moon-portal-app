import { useChainModal, useConnectModal } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useBalance,
  useChainId,
  useChains,
  useConfig,
} from "wagmi";
import { mainnet } from "wagmi/chains";

export const useWallet = () => {
  const {
    address: walletAddress,
    isConnected: isWalletConnected,
    chain: walletChain,
  } = useAccount();

  const { chains } = useConfig();
  const {
    data: walletBalance,
    isError: isBalanceError,
    isLoading,
  } = useBalance();
  const { openConnectModal } = useConnectModal();
  const { openChainModal: openRainbowChainModal } = useChainModal();

  const openChainModal = () => {
    if (isWalletConnected && openRainbowChainModal) openRainbowChainModal();
    else if (openConnectModal) openConnectModal();
  };

  return {
    walletAddress,
    isWalletConnected,
    walletChain:
      walletChain || (chains && chains.length > 0 ? chains?.[0] : mainnet),
    chains,
    walletBalance,
    isBalanceError,
    openChainModal,
    openConnectModal: openConnectModal ? openConnectModal : () => {},
  };
};
