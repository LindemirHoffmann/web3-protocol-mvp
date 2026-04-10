const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying with account:", deployer.address);

  const initialSupply = hre.ethers.parseUnits("1000000", 18);
  const rewardRate = hre.ethers.parseUnits("0.000000001", 18);

  // Sepolia ETH/USD price feed (Chainlink)
  const priceFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

  const StudyToken = await hre.ethers.getContractFactory("StudyToken");
  const token = await StudyToken.deploy(initialSupply);
  await token.waitForDeployment();

  const AchievementNFT = await hre.ethers.getContractFactory("AchievementNFT");
  const nft = await AchievementNFT.deploy("https://seu-link-metadata/");
  await nft.waitForDeployment();

  const PriceOracle = await hre.ethers.getContractFactory("PriceOracle");
  const oracle = await PriceOracle.deploy(priceFeedAddress);
  await oracle.waitForDeployment();

  const Staking = await hre.ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(await token.getAddress(), await oracle.getAddress(), rewardRate);
  await staking.waitForDeployment();

  const SimpleDAO = await hre.ethers.getContractFactory("SimpleDAO");
  const dao = await SimpleDAO.deploy(await token.getAddress());
  await dao.waitForDeployment();

  console.log("StudyToken:", await token.getAddress());
  console.log("AchievementNFT:", await nft.getAddress());
  console.log("PriceOracle:", await oracle.getAddress());
  console.log("Staking:", await staking.getAddress());
  console.log("SimpleDAO:", await dao.getAddress());

  // transfere tokens para o contrato de staking poder pagar recompensas
  const rewardFund = hre.ethers.parseUnits("200000", 18);
  const tx = await token.transfer(await staking.getAddress(), rewardFund);
  await tx.wait();

  console.log("Reward fund sent to staking contract.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});