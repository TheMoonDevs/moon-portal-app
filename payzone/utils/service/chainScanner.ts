import {
  bytesToHex,
  decodeAbiParameters,
  encodeAbiParameters,
  zeroAddress,
} from "viem";
import { chainEnum } from "../constants/appInfo";
import { ZeroAddress, zeroPadBytes } from "ethers";

interface ChainApiInfo {
  baseURL: string;
  accountTxEndpoint: string;
  apiKey: string;
}

export const API_KEYS = {
  BSCTestnet: process.env.NEXT_PUBLIC_BSCTESTNET_KEY || "",
  BaseSepolia: process.env.NEXT_PUBLIC_BASESCAN_API_KEY || "",
};

export const chainAPIData = new Map<chainEnum, ChainApiInfo>();

//chainAPIData.set(chainEnum.sepolia, "https://api-sepolia.octofi.com");
//chainAPIData.set(chainEnum.fuji, "https://api-fuji.octofi.com");
//Powered by https://ftmscan.io APIs
chainAPIData.set(chainEnum.bscTestnet, {
  accountTxEndpoint: "?module=account&action=tokentx&page=1&sort=asc",
  apiKey: API_KEYS.BSCTestnet,
  baseURL: "https://api-testnet.bscscan.com/api",
});
chainAPIData.set(chainEnum.baseSepolia, {
  accountTxEndpoint: "?module=account&action=tokentx&page=1&sort=asc",
  apiKey: API_KEYS.BaseSepolia,
  baseURL: "https://base-sepolia.blockscout.com/api",
});

export const ChainScanner = {
  // fetchAllTxPromises: (isTestnet: boolean, address: string) => {
  //   let promises = [
  //     ChainScanner.fetchAllTransactions(chainEnum.mainnet, address),
  //     ChainScanner.fetchAllTransactions(chainEnum.avalanche, address),
  //     ChainScanner.fetchAllTransactions(chainEnum.fantom, address),
  //   ];
  //   if (isTestnet)
  //     promises = [
  //       ChainScanner.fetchAllTransactions(chainEnum.sepolia, address),
  //       ChainScanner.fetchAllTransactions(chainEnum.fuji, address),
  //       ChainScanner.fetchAllTransactions(chainEnum.ftmTestnet, address),
  //     ];
  //   return promises;
  // },
  fetchAllTransactions: (
    _chain: chainEnum,
    address: string,
    contract: string
  ) => {
    return new Promise(async (resolve, reject) => {
      try {
        const _chainApiInfo = chainAPIData.get(_chain);
        const url = `${_chainApiInfo?.baseURL}${_chainApiInfo?.accountTxEndpoint}&apikey=${_chainApiInfo?.apiKey}&contractaddress=${contract}&address=${address}`;

        // console.log("fetcingTransactions", url);
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          mode: "no-cors",
        });
        if (response.ok) {
          const data = await response.json();
          // console.log("fetchedTransactions", data);
          if (data.status == "1" && Array.isArray(data.result))
            resolve(data.result);
          else resolve([]);
        } else {
          reject(response);
        }
      } catch (err) {
        reject(err);
      }
    });
  },
};
