"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { WagmiProvider, createConfig } from "wagmi";
import { base, baseSepolia, bscTestnet, mainnet } from "wagmi/chains";
import {
  RainbowKitProvider,
  darkTheme,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { APP_INFO } from "../constants/appInfo";

const queryClient = new QueryClient();
// import { publicProvider } from "wagmi/providers/public";

export const DEFAULT_CHAINS = [base, baseSepolia];

const wagmiConfig = getDefaultConfig({
  appName: "Moon Payments App",
  projectId: "YOUR_PROJECT_ID",
  appIcon: APP_INFO.icon,
  chains: [base, baseSepolia],
  //storage: localStorage,
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
