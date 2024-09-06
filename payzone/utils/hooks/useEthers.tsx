"use client";

import { useMemo } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import {
  FallbackProvider,
  JsonRpcProvider,
  BrowserProvider,
  JsonRpcSigner,
} from "ethers";
import { PublicClient, WalletClient, type HttpTransport } from "viem";

export function publicClientToProvider(publicClient: PublicClient) {
  const { chain, transport } = publicClient;
  const network = {
    chainId: chain?.id ?? 0,
    name: chain?.name ?? "",
    ensAddress: chain?.contracts?.ensRegistry?.address,
  };
  if (transport.type === "fallback") {
    const providers = (transport.transports as ReturnType<HttpTransport>[]).map(
      ({ value }) => new JsonRpcProvider(value?.url, network)
    );
    if (providers.length === 1) return providers[0];
    return new FallbackProvider(providers);
  }
  return new JsonRpcProvider(transport.url, network);
}

/** Hook to convert a viem Public Client to an ethers.js Provider. */
export function useEthersProvider({ chainId }: { chainId?: number } = {}) {
  const publicClient = usePublicClient({ chainId }) as PublicClient; // Add type assertion
  return useMemo(() => publicClientToProvider(publicClient), [publicClient]);
}

export function walletClientToSigner(walletClient: WalletClient) {
  const { account, chain, transport } = walletClient;
  const network = {
    chainId: chain?.id ?? 0,
    name: chain?.name ?? "",
    ensAddress: chain?.contracts?.ensRegistry?.address,
  };
  const provider = new BrowserProvider(transport, network);
  const signer = new JsonRpcSigner(provider, account?.address ?? "");
  return signer;
}

/** Hook to convert a viem Wallet Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: walletClient } = useWalletClient({ chainId });
  return useMemo(
    () => (walletClient ? walletClientToSigner(walletClient) : undefined),
    [walletClient]
  );
}
