const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Desplegando con la cuenta:", deployer.address);

  const name = process.env.TOKEN_NAME || "Mi Token";
  const symbol = process.env.TOKEN_SYMBOL || "MTK";
  const decimals = parseInt(process.env.TOKEN_DECIMALS || "18", 10);
  const initialSupply = process.env.TOKEN_SUPPLY || "1000000";

  const MiToken = await hre.ethers.getContractFactory("MiToken");
  const token = await MiToken.deploy(name, symbol, decimals, initialSupply);
  await token.waitForDeployment();
  const address = await token.getAddress();

  console.log("Token desplegado en:", address);
  console.log("  name:", name);
  console.log("  symbol:", symbol);
  console.log("  decimals:", decimals);
  console.log("  supply:", initialSupply, symbol);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
