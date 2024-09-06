# Contract stuff

link for verification integration - https://docs.base.org/base-camp/docs/hardhat-verify/hardhat-verify-sbs/

## Base seplia

Deployed & Verified on base Seploia - https://base-sepolia.blockscout.com/address/0x718feaac496184980F7ccf0b07360C70b63c1705?tab=txs

Owner - 0xe7883c2AEE56e664aAeb3E60334B1ae83d1E50C9 - SHARED - TMD_TESTNET_KEY

## Base

Onwer -

Deployment on Base Chain

```shell
# deploying contract on polygon
npm run compile
rm -rf deployments/base
npm run deploy base

# copy contract address & Add consumer at - https://vrf.chain.link/polygon/512 or (subscriptionId)
npm run generateABI base
npx hardhat verify --constructor-args arguments.js --network <chain> ADDRESS
```
