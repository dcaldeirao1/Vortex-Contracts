let totalWethCollected = 0; // removeEarly

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

async function removeLiqEarly(factory, _tokenID) {
  // Fetch the position details
  const position = await factory.getPosition(_tokenID);
  const liquidity = position.liquidity;
  const token0 = position.token0;
  const token1 = position.token1;

  console.log(`Position Details:`, position);
  console.log("token0 = ", token0);
  console.log("token1 = ", token1);
  console.log("Liquidity = ", liquidity);

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

  console.log(`Pool Address: ${poolAddress}`);
  console.log(`Sqrt Price X96: ${sqrtPriceX96}`);
  console.log(`Price: ${price}`);

  // Calculate liquidity to remove based on desired amount of WETH
  const wethAmountToRemove = ethers.parseUnits("0.0001", 18); // 0.1 WETH

  // Calculate the corresponding amount of tokens to remove
  const tokensToRemove = (wethAmountToRemove * 10n ** 18n) / price;
  console.log("tokensToRemove = ", tokensToRemove);

  // Calculate the liquidity to remove (SQRT)
  const liquidityToRemove = sqrt(wethAmountToRemove * tokensToRemove);
  console.log(
    `Calculated Liquidity to Remove: ${liquidityToRemove.toString()}`
  );

  // Ensure liquidity to remove is not greater than the available liquidity
  const liquidityToRemoveSafe =
    liquidityToRemove > liquidity ? liquidity : liquidityToRemove;

  // Remove liquidity
  const tx = await factory.removeLiquidity(_tokenID, liquidityToRemoveSafe);
  const receipt = await tx.wait();

  console.log("Initial liquidity removed successfully!");
}

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(
    "Interacting with the factory contract using the account:",
    deployer.address
  );

  // Replace this with the address of the deployed factory contract
  const factoryAddress = "0xBD89A44A2DEC9A1B4AaeEb1b64bE4eF0adafAB8c";

  const lockerAddress = "0x31828AAC589e46549F3980912A6a8001F81a9eD5";

  const treasuryAddress = "0x15ACB85CFc44fED7d5E4cC2d30342A6Dc7712405";

  const teamWallet = "0x6c55eb7cE46110Faa04F0CcaDa8b8f34eEcd471F";

  const WETH_address = process.env.SEPOLIA_WETH;

  // Get the locker contract instance
  const Locker = await ethers.getContractFactory("LiquidityLocker");
  const locker = await Locker.attach(lockerAddress);

  // Connect to the factory contract using its ABI and address
  const Factory = await ethers.getContractFactory("MyFactory");
  const factory = await Factory.attach(factoryAddress);

  // Fetch all tokens and their timestamps
  const [
    addresses,
    tokenIds,
    timestamps,
    liquidityRemovedStatus,
    zeroFeesDays,
    istokenDEAD,
    lastFee,
  ] = await factory.getAllTokens();

  const [_tokenId, _isLocked, _lockID, _unlockTime] =
    await locker.getAllTokens();

  // Print results
  console.log("Addresses:", addresses);
  console.log("Token IDs:", tokenIds);
  console.log("Timestamps:", timestamps);
  console.log("liquidityRemovedStatus:", liquidityRemovedStatus);
  console.log("zeroFeesDays:", zeroFeesDays);
  console.log("istokenDEAD:", istokenDEAD);
  console.log("lastFee:", lastFee);

  // Print results
  console.log("Token IDs:", _tokenId);
  console.log("isLocked:", _isLocked);
  console.log("Lock ID:", _lockID);
  console.log("Unlock Time:", _unlockTime);

  // Loop through all tokens to check their launch time
  for (let i = 0; i < addresses.length; i++) {
    if (istokenDEAD[i] == false && _isLocked[i] == true) {
      // check if it is locked

      // Collect the fees from the locker
      const collectFeesTx = await locker.collectFees(
        tokenIds[i],
        factoryAddress
      );
      await collectFeesTx.wait();
      console.log(`Fees collected for tokenID ${tokenIds[i]}`);

      //const feescollectedEvent = await getFeesCollectedEvent(locker);

      const feescollectedEvent = await getLatestEvent(locker, "FeesCollected");

      const tokenID = feescollectedEvent.args[0];
      const amount0 = feescollectedEvent.args[1];
      const amount1 = feescollectedEvent.args[2];
      console.log("tokenID: ", tokenID);
      console.log("amount0: ", amount0);
      console.log("amount1: ", amount1);

      let token0, token1;
      if (addresses[i].toLowerCase() < WETH_address.toLowerCase()) {
        token0 = addresses[i];
        token1 = WETH_address;
        if (amount0 > 0) {
          console.log("Selling with factory function...");
          const tx1 = await factory.swapTokensForWETH(
            amount0,
            addresses[i],
            tokenIds[i]
          );
          await tx1.wait();
          console.log("Swap performed successfully!");

          //const tokensSwappedEvent = await getTokensSwappedEvent(factory);

          const tokensSwappedEvent = await getLatestEvent(
            factory,
            "TokensSwapped"
          );

          const ethReceived = tokensSwappedEvent.args[0];
          const formattedETH = ethers.formatUnits(ethReceived, 18);
          console.log("WETH received: ", formattedETH);

          const rewardAmount = ethReceived + amount1;
          totalWethCollected = BigInt(totalWethCollected) + rewardAmount;
        }
      } else {
        token0 = WETH_address;
        token1 = addresses[i];
        if (amount1 > 0) {
          console.log("Selling with factory function...");
          tx2 = await factory.swapTokensForWETH(
            amount0,
            addresses[i],
            tokenIds[i]
          );
          await tx2.wait();
          console.log("Swap performed successfully!");
          // const feeFromSwap = amount0 *1/100;

          //const tokensSwappedEvent = await getTokensSwappedEvent(factory);

          const tokensSwappedEvent = await getLatestEvent(
            factory,
            "TokensSwapped"
          );

          const ethReceived = tokensSwappedEvent.args[0];
          const formattedETH = ethers.formatUnits(ethReceived, 18);
          console.log("WETH received: ", formattedETH);

          const rewardAmount = ethReceived + amount0;
          totalWethCollected = totalWethCollected + rewardAmount;
        }
      }

      if (amount0 <= lastFee && amount1 <= lastFee) {
        await factory.updateNoFeeDays2(tokenIds[i]);

        console.log("Updated no fee days");

        //const eventName = "RemoveEarly";

        //const latestEvent = await getLatestEvent(factory);

        //const eventResult = latestEvent.args[0];

        //if (eventResult == true) {
        console.log("Removing early...");
        await removeLiqEarly(factory, tokenIds[i]);
        //}
      } else {
        await factory.resetNoFeeDays(tokenIds[i]);
        //console.log('Token is dead');
        console.log("NoFeesDays Reset");
      }
    } else if (istokenDEAD[i] == false && _isLocked[i] == false) {
      // Collect the fees from the position
      console.log(
        `Collecting fees for token at address ${addresses[i]} with token ID ${tokenIds[i]}`
      );
      const collectTx = await factory.collectFees(tokenIds[i]);
      await collectTx.wait();
      console.log("Fees collected successfully!");

      // Get the TokenDeployed event emitted by the token contract
      //const feescollectedEvent = await getFeesCollectedEvent(factory);

      const feescollectedEvent = await getLatestEvent(factory, "FeesCollected");

      const tokenID = feescollectedEvent.args[0];
      const amount0 = feescollectedEvent.args[1];
      const amount1 = feescollectedEvent.args[2];
      console.log("tokenID: ", tokenID);
      console.log("amount0: ", amount0);
      console.log("amount1: ", amount1);

      let token0, token1;
      if (addresses[i].toLowerCase() < WETH_address.toLowerCase()) {
        token0 = addresses[i];
        token1 = WETH_address;
        if (amount0 > 0) {
          console.log("Selling with factory function...");
          const tx1 = await factory.swapTokensForWETH(
            amount0,
            addresses[i],
            tokenIds[i]
          );
          await tx1.wait();
          console.log("Swap performed successfully!");

          //const tokensSwappedEvent = await getTokensSwappedEvent(factory);

          const tokensSwappedEvent = await getLatestEvent(
            factory,
            "TokensSwapped"
          );

          const ethReceived = tokensSwappedEvent.args[0];
          const formattedETH = ethers.formatUnits(ethReceived, 18);
          console.log("WETH received: ", formattedETH);

          const rewardAmount = ethReceived + amount1;
          totalWethCollected = BigInt(totalWethCollected) + rewardAmount;
        }
      } else {
        token0 = WETH_address;
        token1 = addresses[i];
        if (amount1 > 0) {
          console.log("Selling with factory function...");
          tx2 = await factory.swapTokensForWETH(
            amount0,
            addresses[i],
            tokenIds[i]
          );
          await tx2.wait();
          console.log("Swap performed successfully!");
          // const feeFromSwap = amount0 *1/100;

          //const tokensSwappedEvent = await getTokensSwappedEvent(factory);

          const tokensSwappedEvent = await getLatestEvent(
            factory,
            "TokensSwapped"
          );

          const ethReceived = tokensSwappedEvent.args[0];
          const formattedETH = ethers.formatUnits(ethReceived, 18);
          console.log("WETH received: ", formattedETH);

          const rewardAmount = ethReceived + amount0;
          totalWethCollected = totalWethCollected + rewardAmount;
        }
      }

      if (amount0 <= lastFee && amount1 <= lastFee) {
        await factory.updateNoFeeDays2(tokenIds[i]);
        console.log("Updated no fee days");

        //const eventName = "RemoveEarly";

        const latestEvent = await getLatestEvent(factory, "RemoveFaster");

        const isRemoveEarly = latestEvent.args[0];

        if (isRemoveEarly == 1) {
          console.log("Removing early....");
          await removeLiqEarly(factory, tokenIds[i]);
        }
      } else {
        await factory.resetNoFeeDays(tokenIds[i]);
        //console.log('Token is dead');
        console.log("NoFeesDays Reset");
      }
    } else {
      console.log("Dead token");
    }
  }

  if (totalWethCollected > 0) {
    console.log("Unwrapping...");
    tx_convert = await factory.convertWETHToETH(totalWethCollected);
    await tx_convert.wait();

    const half_amount = totalWethCollected / BigInt(2);
    const treasury_amount = (half_amount * BigInt(6)) / BigInt(10);
    const team_amount = (half_amount * BigInt(4)) / BigInt(10);

    // send to staking contract by calling addRewards function
    console.log("Sending fees to the staking contract...");
    const tx = await factory.callAddRewards(half_amount);
    await tx.wait();
    console.log("Sent to the staking contract!");

    // send 0.3% to the treasury contract
    const txSend = await deployer.sendTransaction({
      to: treasuryAddress,
      value: treasury_amount,
      gasLimit: 9000000,
    });

    // Wait for the transaction to be mined
    await txSend.wait();
    console.log("ETH sent successfully to the treasury!");

    // send 0.2% to the team wallet
    const tx2 = await deployer.sendTransaction({
      to: teamWallet,
      value: team_amount,
      gasLimit: 9000000, // Set gas limit for a simple transfer
    });

    // Wait for the transaction to be mined
    await tx2.wait();
    console.log("ETH sent successfully to the team!");
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
