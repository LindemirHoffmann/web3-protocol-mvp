const { ethers } = require("ethers");
require("dotenv").config();

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const tokenAbi = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];

const stakingAbi = [
  "function stake(uint256 amount) external",
  "function claimReward() external",
  "function pendingReward(address user) external view returns (uint256)"
];

const nftAbi = [
  "function mintTo(address to) external returns (uint256)"
];

const daoAbi = [
  "function createProposal(string calldata description, uint256 durationInSeconds) external returns (uint256)",
  "function vote(uint256 proposalId, bool support) external"
];

const TOKEN_ADDRESS = "COLOQUE_O_ENDERECO_DO_TOKEN";
const STAKING_ADDRESS = "COLOQUE_O_ENDERECO_DO_STAKING";
const NFT_ADDRESS = "COLOQUE_O_ENDERECO_DO_NFT";
const DAO_ADDRESS = "COLOQUE_O_ENDERECO_DA_DAO";

async function main() {
  const token = new ethers.Contract(TOKEN_ADDRESS, tokenAbi, wallet);
  const staking = new ethers.Contract(STAKING_ADDRESS, stakingAbi, wallet);
  const nft = new ethers.Contract(NFT_ADDRESS, nftAbi, wallet);
  const dao = new ethers.Contract(DAO_ADDRESS, daoAbi, wallet);

  const amount = ethers.parseUnits("100", 18);

  console.log("Approving tokens...");
  await (await token.approve(STAKING_ADDRESS, amount)).wait();

  console.log("Staking tokens...");
  await (await staking.stake(amount)).wait();

  console.log("Minting NFT...");
  await (await nft.mintTo(wallet.address)).wait();

  console.log("Creating proposal...");
  await (await dao.createProposal("Aumentar recompensa do staking", 3600)).wait();

  console.log("Voting...");
  await (await dao.vote(1, true)).wait();

  const pending = await staking.pendingReward(wallet.address);
  console.log("Pending reward:", ethers.formatUnits(pending, 18));
}

main().catch(console.error);