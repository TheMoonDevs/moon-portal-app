import { createClient, createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";
import { ENTRYPOINT_ADDRESS_V06 } from "permissionless";
import { paymasterActionsEip7677 } from "permissionless/experimental";
import { useAccount } from "wagmi";
// import { IS_TESTNET } from "../constants/env.conf";
const { chain } = useAccount();
const IS_TESTNET = chain?.testnet;
export const client = createPublicClient({
  chain: IS_TESTNET ? baseSepolia : base,
  transport: http(),
});

const paymasterService = process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT;
console.log("paymasterService", paymasterService);
export const paymasterClient = createClient({
  chain: IS_TESTNET ? baseSepolia : base,
  transport: http(paymasterService),
}).extend(paymasterActionsEip7677(ENTRYPOINT_ADDRESS_V06));
