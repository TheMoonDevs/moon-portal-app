"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base, baseSepolia, bscTestnet, mainnet } from "wagmi/chains";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
const queryClient = new QueryClient();
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { APP_INFO } from "../constants/appInfo";

coinbaseWallet.preference = "all";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [coinbaseWallet],
    },
    {
      groupName: "Popular",
      wallets: [metaMaskWallet, rainbowWallet],
    },
    {
      groupName: "Wallet Connect",
      wallets: [walletConnectWallet],
    },
  ],
  {
    appName: APP_INFO.name,
    projectId: "2f785c1b9ea689743190f2e9871ce3df",
  }
);

export const wagmiConfig = createConfig({
  connectors,
  multiInjectedProviderDiscovery: false,
  chains: [baseSepolia, base],
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
});
// const getSiweMessageOptions: GetSiweMessageOptions = () => ({
//   statement: "Authorize Moon Payments App to use your metamask wallet?",
// });

export const WalletWagmiProvider = ({ children, session }: any) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "white",
            accentColorForeground: "black",
            borderRadius: "none",
            fontStack: "system",
            overlayBlur: "small",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
