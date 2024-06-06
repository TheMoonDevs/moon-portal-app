async function main() {
  const { ethers } = require("hardhat");
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log(
    "Account balance:",
    (await deployer.provider.getBalance(deployer.address)).toString()
  );

  const Token = await ethers.getContractFactory("TMDToken"); //Replace with name of your smart contract
  const token = await Token.deploy();

  console.log("Token address:", token.target);
}

// 0x718feaac496184980F7ccf0b07360C70b63c1705

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
