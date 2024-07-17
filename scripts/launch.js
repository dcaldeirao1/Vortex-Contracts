const { SwapRouter } = require("@uniswap/v3-sdk");

async function getLatestEvent(token, eventName) {
  // Get the filter for the TokenDeployed event
  const filter = token.filters[eventName]();

  // Query the filter for events emitted by the token contract
  const events = await token.queryFilter(filter);

  // Find the TokenDeployed event emitted by the token contract
  const latestEvent = events[events.length - 1]; // Get the latest event

  return latestEvent;
}

// Babylonian method for square root calculation using BigInt
function sqrt(value) {
  if (value < 0n) {
    throw new Error("Square root of negative numbers is not supported");
  }
  if (value === 0n) return 0n;
  let z = value;
  let x = value / 2n + 1n;
  while (x < z) {
    z = x;
    x = (value / x + x) / 2n;
  }
  return z;
}

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(
    "Interacting with the factory contract using the account:",
    deployer.address
  );

  // Replace these with your desired token name, symbol, and total supply
  const tokenName = "ShitCoin";
  const tokenSymbol = "Shit";
  const tokenSupply = "100";

  // Replace this with the address of the deployed factory contract
  const factoryAddress = "0xa57797f37459B9a9A222407073694bD3C2E3A052";

  const lockerAddress = "0x3B34e02f29B8a27682E8F4cb7142F23DD365f048";

  //const teamWallet = "0xdc28630221B2d58B8E249Df6d96c928f57bed952";

  const WETH_address = process.env.SEPOLIA_WETH;

  const nftAddress = process.env.SEPOLIA_POSITION_MANAGER;

  // Connect to the factory contract using its ABI and address
  const Factory = await ethers.getContractFactory("MyFactory");
  const factory = await Factory.attach(factoryAddress);

  const LiquidityLocker = await ethers.getContractFactory("LiquidityLocker");
  const locker = await LiquidityLocker.attach(lockerAddress);

  const tokenAmount = ethers.parseUnits(tokenSupply, 18); // 1,000,000 tokens with 18 decimals
  const wethAmount = ethers.parseUnits("0.0001", 18); // 0.01 WETH

  // Amount of ETH to swap
  const amountIn = ethers.parseUnits("0.0000", 18); // 0.01 ETH

  // Call the deployToken function of the factory contract
  const tx = await factory.deployToken(tokenName, tokenSymbol, tokenSupply);
  await tx.wait();
  console.log("Token deployed successfully!");

  const tokenDeployedEvent = await getLatestEvent(factory, "TokenDeployed");

  const tokenAddress = tokenDeployedEvent.args[0];
  console.log("Token Address: ", tokenAddress);

  /* let token0, token1, token0amount, token1amount;
  if (tokenAddress.toLowerCase() < WETH_address.toLowerCase()) {
    token0 = tokenAddress;
    token1 = WETH_address;
    token0amount = tokenAmount;
    token1amount = wethAmount;
  } else {
    token0 = WETH_address;
    token1 = tokenAddress;
    token0amount = wethAmount;
    token1amount = tokenAmount;
  }

  // Calculate sqrtPriceX96 considering both tokens have 18 decimals
  const priceRatio =
    (BigInt(token1amount) * BigInt(10 ** 18)) / BigInt(token0amount);
  const sqrtPriceRatio = sqrt(priceRatio);
  const sqrtPriceX96 = (sqrtPriceRatio * 2n ** 96n) / 10n ** 9n; */

  console.log("Adding initial liquidity, swapping and locking");
  const txtest = await factory.addLiquidityLockSwap(tokenAddress, amountIn, {
    value: amountIn,
    gasLimit: 9000000,
  });
  await txtest.wait();
  console.log("Success!");

  /* const tokensSwappedEvent = await getLatestEvent(factory, "TokensSwapped");

  const tokensReceived = tokensSwappedEvent.args[0];
  const formattedTokens = ethers.formatUnits(tokensReceived, 18);
  console.log("Tokens received: ", formattedTokens); */
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
