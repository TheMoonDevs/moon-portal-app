import { ENTRYPOINT_ADDRESS_V06, UserOperation } from "permissionless";
import {
  Address,
  BlockTag,
  Hex,
  decodeAbiParameters,
  decodeFunctionData,
} from "viem";
import { base, baseSepolia } from "viem/chains";
import { client } from "./config";
import {
  coinbaseSmartWalletABI,
  coinbaseSmartWalletFactoryAddress,
  coinbaseSmartWalletProxyBytecode,
  coinbaseSmartWalletV1Implementation,
  erc1967ProxyImplementationSlot,
  magicSpendAddress,
} from "./constants";
import TMDToken from "../constants/erc20.json";
import { TOKEN_INFO } from "../constants/appInfo";
export async function willSponsor({
  chainId,
  entrypoint,
  userOp,
}: {
  chainId: number;
  entrypoint: string;
  userOp: UserOperation<"v0.6">;
}) {
  const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === "true";
  const chainx = IS_TESTNET ? baseSepolia : base;
  // const chain = baseSepolia;
  // check chain id
  //console.log("1", { chainId, chain });
  if (chainId !== chainx.id) return false;
  // check entrypoint
  // not strictly needed given below check on implementation address, but leaving as example
  // //console.log("2", { entrypoint });
  if (entrypoint.toLowerCase() !== ENTRYPOINT_ADDRESS_V06.toLowerCase())
    return false;

  try {
    // check the userOp.sender is a proxy with the expected bytecode
    const code = await client.getCode({ address: userOp.sender });
    // //console.log("3", { userOp });
    // const code = (await client.request({
    //   method: "eth_getCode",
    //   params: [userOp.sender, "latest"],
    // })) as Hex;

    // //console.log("4", { code });

    if (!code) {
      // no code at address, check that the initCode is deploying a Coinbase Smart Wallet
      // factory address is first 20 bytes of initCode after '0x'
      const factoryAddress = userOp.initCode.slice(0, 42);
      //console.log("5", { factoryAddress });
      if (
        factoryAddress.toLowerCase() !==
        coinbaseSmartWalletFactoryAddress.toLowerCase()
      )
        return false;
    } else {
      // code at address, check that it is a proxy to the expected implementation
      //console.log("6", { code, coinbaseSmartWalletProxyBytecode });
      if (code != coinbaseSmartWalletProxyBytecode) return false;
      //console.log("7", { userOp });
      // check that userOp.sender proxies to expected implementation
      const implementation = await client.request<{
        Parameters: [Address, Hex, BlockTag];
        ReturnType: Hex;
      }>({
        method: "eth_getStorageAt",
        params: [userOp.sender, erc1967ProxyImplementationSlot, "latest"],
      });
      const implementationAddress = decodeAbiParameters(
        [{ type: "address" }],
        implementation
      )[0];
      if (implementationAddress != coinbaseSmartWalletV1Implementation)
        return false;
    }
    //console.log("8", { userOp });
    // check that userOp.callData is making a call we want to sponsor
    const calldata = decodeFunctionData({
      abi: coinbaseSmartWalletABI,
      data: userOp.callData,
    });
    //console.log("9", { calldata });
    // keys.coinbase.com always uses executeBatch
    if (calldata.functionName !== "executeBatch") return false;
    //console.log("10", { calldata });
    if (!calldata.args || calldata.args.length == 0) return false;

    const calls = calldata.args[0] as {
      target: Address;
      value: bigint;
      data: Hex;
    }[];
    // modify if want to allow batch calls to your contract
    //console.log("11", { calls });

    if (calls.length > 2) return false;

    //console.log("12", { calls });
    let callToCheckIndex = 0;
    if (calls.length > 1) {
      // if there is more than one call, check if the first is a magic spend call
      if (calls[0].target.toLowerCase() !== magicSpendAddress.toLowerCase())
        return false;
      callToCheckIndex = 1;
    }

    if (
      calls[callToCheckIndex]?.target?.toLowerCase() !==
      TOKEN_INFO.contractAddress?.toLowerCase()
    )
      return false;
    //console.log("13", { calls });
    const innerCalldata = decodeFunctionData({
      abi: TMDToken,
      data: calls[callToCheckIndex].data,
    });
    //console.log("14", { innerCalldata });
    if (innerCalldata.functionName !== "placeBets") return false;
    return true;
  } catch (e) {
    //console.log(`willSponsor check failed: ${e}`);
    return false;
  }
}
