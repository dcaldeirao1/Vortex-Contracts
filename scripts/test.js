//const { ethers } = require("ethers");

// Initialize provider
const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_BASE_ENDPOINT);

// Token ABI (just the functions we need)
const tokenAbi = [
  // ERC20 functions
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const poolAbi = [
  {
    inputs: [],
    name: "slot0",
    outputs: [
      { internalType: "uint160", name: "sqrtPriceX96", type: "uint160" },
      { internalType: "int24", name: "tick", type: "int24" },
      { internalType: "uint16", name: "observationIndex", type: "uint16" },
      {
        internalType: "uint16",
        name: "observationCardinality",
        type: "uint16",
      },
      {
        internalType: "uint16",
        name: "observationCardinalityNext",
        type: "uint16",
      },
      { internalType: "uint8", name: "feeProtocol", type: "uint8" },
      { internalType: "bool", name: "unlocked", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// Function to get the total supply of the token
async function getTotalSupply(tokenContract) {
  const totalSupply = await tokenContract.totalSupply();
  const decimals = await tokenContract.decimals();
  return ethers.formatUnits(totalSupply, decimals); // Adjust for decimals
}

// Function to calculate the token price using the pool's sqrtPriceX96
async function getTokenPrice(poolAddress) {
  const poolContract = new ethers.Contract(poolAddress, poolAbi, provider);
  const { sqrtPriceX96 } = await poolContract.slot0();
  console.log("sqrtPriceX96 Retrieved:", sqrtPriceX96.toString());

  // Convert sqrtPriceX96 to BigInt to handle large numbers
  const sqrtPriceX96BigInt = BigInt(sqrtPriceX96);

  // Square the sqrtPriceX96 to get the price ratio in X96 format

  // Q192 represents 2^192, which is the scaling factor
  const Q192 = BigInt(2) ** BigInt(96);

  const priceX96 = sqrtPriceX96BigInt / Q192;

  // Calculate the price in terms of Token1 per Token0
  const price = priceX96 * priceX96;

  // Return the price with 18 decimals (adjust if needed)
  return ethers.formatUnits(price.toString(), 18);
}

// Function to calculate the market cap
async function calculateMarketCap(tokenContract, poolAddress) {
  const totalSupply = await getTotalSupply(tokenContract);
  const tokenPrice = await getTokenPrice(poolAddress);

  // Convert totalSupply and tokenPrice to BigNumber for multiplication
  const totalSupplyBN = ethers.parseUnits(totalSupply, 0); // Assuming 18 decimals
  const tokenPriceBN = ethers.parseUnits(tokenPrice, 18);

  // Calculate the market cap
  const marketCap = totalSupplyBN * tokenPriceBN;

  // Adjust back to 18 decimals for market cap
  return ethers.formatUnits(marketCap.toString(), 18);
}

// Main function to run the calculations
async function main() {
  const factoryAddress = "0xb6A6Df60DA44242e0CDF5d5f6Fc2fC58f24a5233";

  const Factory = await ethers.getContractFactory("MyFactory");
  const factory = await Factory.attach(factoryAddress);

  // Address of the token contract
  const tokenAddress = "0xdb61863E82176C6872b29053D20E1C73721C271B";
  const WETH_address = process.env.BASE_WETH;

  console.log("Getting Pool...");
  const pool = await factory.get_Pool(WETH_address, tokenAddress, 10000);
  console.log("Pool Address: ", pool);

  // Create a new instance of the token contract
  const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);

  const price = await getTokenPrice(pool);
  console.log("Token Price: ", price);

  const ts = await getTotalSupply(tokenContract);
  console.log("Token Supply: ", ts);

  const mc = await calculateMarketCap(tokenContract, pool);
  console.log("Marketcap: ", mc);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
