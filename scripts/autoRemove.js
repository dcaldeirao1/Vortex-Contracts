const hre = require("hardhat");
const { ethers } = hre;

async function getLatestEvent(token, eventname) {
  // Get the filter for the specified event
  const filter = token.filters[eventname]();

  // Query the filter for events emitted by the contract
  const events = await token.queryFilter(filter);

  //console.log("Events: ", events);

  // Find the latest event
  const latestEvent = events[events.length - 1]; // Get the latest event

  return latestEvent;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Removing liquidity with the account:", deployer.address);

  const factoryAddress = "0xC1e8b127C08aDA6B5c7FfCB237870c304BCd5508";

  const lockerAddress = "0x4ee875d1cd3DC0151332d54c13055A7f69c350Fd";

  const position_manager = process.env.SEPOLIA_POSITION_MANAGER;

  const Factory = await hre.ethers.getContractFactory("MyFactory");
  const factory = await Factory.attach(factoryAddress);

  const LiquidityLocker = await ethers.getContractFactory("LiquidityLocker");
  const locker = await LiquidityLocker.attach(lockerAddress);

  const [
    addresses,
    tokenIds,
    timestamps,
    liquidityRemovedStatus,
    zeroFeesDays,
    istokenDEAD,
    lastFee,
    lockID,
    isLocked,
    unlockTime,
  ] = await factory.getAllTokens();

  //const [_tokenId, _isLocked, _lockID, _unlockTime] = await locker.getAllTokens();

  // Print results
  console.log("Addresses:", addresses);
  console.log("Token IDs:", tokenIds);
  console.log("Timestamps:", timestamps);
  console.log("liquidityRemovedStatus:", liquidityRemovedStatus);
  console.log("lockID:", lockID);
  console.log("isLocked:", isLocked);
  console.log("unlockTime:", unlockTime);

  // Print results
  /* console.log("Token IDs:", _tokenId);
  console.log("isLocked:", _isLocked);
  console.log("Lock ID:", _lockID);
  console.log("Unlock Time:", _unlockTime); */

  const currentTime = Math.floor(Date.now() / 1000); // current time in seconds since Unix epoch

  // Loop through all tokens to check their launch time
  for (let i = 0; i < addresses.length; i++) {
    // Check if the token's initial liquidity has already been removed

    if (!liquidityRemovedStatus[i] && currentTime > unlockTime[i]) {
      // Unlock the liquidity
      console.log("Unlocking liquidity...");
      //const duration = 3600 * 24 * 7; // 1 week in seconds
      const unlockLiquidityTx = await locker.unlockLiquidity(
        lockID[i],
        factoryAddress
      );
      await unlockLiquidityTx.wait();

      console.log("Liquidity unlocked");

      // store the lockId for each token
      console.log("Storing lock details...");
      const txxx = await factory.storeLockID(tokenIds[i], lockID[i], false, 0);
      await txxx.wait();

      console.log(
        `Removing liquidity for token at address ${addresses[i]} with token ID ${tokenIds[i]}`
      );

      // Fetch the position details
      const position = await factory.getPosition(tokenIds[i]);
      const liquidity = position.liquidity;
      const token0 = position.token0;
      const token1 = position.token1;

      /* console.log(`Position Details:`, position);
      console.log("token0 = ", token0);
      console.log("token1 = ", token1);
      console.log("Liquidity = ", liquidity); */

      // Determine the correct pool address
      const poolAddress = await factory.get_Pool(token0, token1, 10000);

      // Fetch pool state (price, liquidity, etc.)
      const poolContract = await ethers.getContractAt(
        "IUniswapV3Pool",
        poolAddress
      );
      const slot0 = await poolContract.slot0();
      const sqrtPriceX96 = slot0.sqrtPriceX96;
      const price = (BigInt(sqrtPriceX96) ** 2n * 10n ** 18n) / 2n ** 192n;
      //const price = _price / (10n ** 18n);

      /* console.log(`Pool Address: ${poolAddress}`);
      console.log(`Sqrt Price X96: ${sqrtPriceX96}`);
      console.log(`Price: ${price}`); */

      // Calculate liquidity to remove based on desired amount of WETH
      const wethAmountToRemove = ethers.parseUnits("0.0001", 18); // 0.1 WETH

      // Calculate the corresponding amount of tokens to remove
      const tokensToRemove = (wethAmountToRemove * 10n ** 18n) / price;
      console.log("tokensToRemove = ", tokensToRemove);

      // Calculate the liquidity to remove (SQRT)
      const liquidityToRemove = sqrt(wethAmountToRemove * tokensToRemove);
      //console.log( `Calculated Liquidity to Remove: ${liquidityToRemove.toString()}` );

      // Ensure liquidity to remove is not greater than the available liquidity
      const liquidityToRemoveSafe =
        liquidityToRemove > liquidity ? liquidity : liquidityToRemove;

      // Remove liquidity
      const tx = await factory.removeLiquidity(
        tokenIds[i],
        liquidityToRemoveSafe
      );

      await tx.wait();

      console.log("Initial liquidity removed successfully!");

      // Approve the locker to manage the NFT
      console.log("Approving LiquidityLocker to manage the factory NFT...");
      const approveTx = await factory.approveNFT(tokenIds[i], lockerAddress);
      await approveTx.wait();

      // Lock the liquidity
      console.log("Locking Liquidity for one year...");
      //const duration = 3600 * 24 * 7; // 1 week in seconds
      const duration = 6;

      const lockLiquidityTx = await locker.lockLiquidity(
        position_manager,
        tokenIds[i],
        duration,
        factoryAddress
      );
      await lockLiquidityTx.wait();

      console.log("Liquidity locked for 1 year.");

      // Get the TokenDeployed event emitted by the token contract
      const liquidityLockedEvent = await getLatestEvent(
        locker,
        "LiquidityLocked"
      );

      const lockId = liquidityLockedEvent.args[0];
      const unlockDate = liquidityLockedEvent.args[3];
      console.log("lockId: ", lockId);

      // store the lockId for each token
      console.log("Storing lockId...");
      const txx = await factory.storeLockID(
        tokenIds[i],
        lockId,
        true,
        unlockDate
      );
      await txx.wait();
    } else if (liquidityRemovedStatus[i] == true && istokenDEAD[i] == true) {
      // Remove all remaining liquidity

      console.log("Unlocking liquidity...");
      //const duration = 3600 * 24 * 7; // 1 week in seconds
      const unlockLiquidityTx = await locker.unlockLiquidity(
        lockID[i],
        factoryAddress
      );
      await unlockLiquidityTx.wait();

      console.log("Liquidity unlocked");

      // Fetch the position details
      const position = await factory.getPosition(tokenIds[i]);
      const liquidity = position.liquidity;

      // Remove liquidity
      const tx = await factory.removeLiquidity(tokenIds[i], liquidity);

      await tx.wait();

      console.log("All remaining liquidity removed successfully!");

      // Approve the locker to manage the NFT
      console.log("Approving LiquidityLocker to manage the factory NFT...");
      const approveTx = await factory.approveNFT(tokenIds[i], lockerAddress);
      await approveTx.wait();
      console.log("Approval successful.");

      // Lock the liquidity
      console.log("Locking liquidity again...");
      //const duration = 3600 * 24 * 7; // 1 week in seconds
      const duration = 120;

      const lockLiquidityTx = await locker.lockLiquidity(
        position_manager,
        tokenIds[i],
        duration,
        factoryAddress
      );
      receipt = await lockLiquidityTx.wait();

      console.log("Liquidity locked.");

      const liquidityLockedEvent = await getLatestEvent(
        locker,
        "LiquidityLocked"
      );

      const lockId = liquidityLockedEvent.args[0];
      const unlockDate = liquidityLockedEvent.args[3];

      console.log("lockId: ", lockId);
      console.log("unlockDate: ", unlockDate);

      // store the lockId for each token
      console.log("Storing lock details...");
      const txx = await factory.storeLockID(
        tokenIds[i],
        lockId,
        true,
        unlockDate
      );
      await txx.wait();
    } else {
      console.log(
        `Token at address ${addresses[i]} with token ID ${tokenIds[i]} is still locked or liquidity has already been removed.`
      );
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

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
