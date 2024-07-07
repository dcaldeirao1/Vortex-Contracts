let totalWethCollected = 0; // removeEarly

async function getLatestEvent(token, eventname) {
  // Get the filter for the specified event
  const filter = token.filters[eventname]();

  // Query the filter for events emitted by the contract
  const events = await token.queryFilter(filter);

  // Find the latest event
  const latestEvent = events[events.length - 1]; // Get the latest event

  return latestEvent;
}

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(
    "Interacting with the factory contract using the account:",
    deployer.address
  );

  // Replace this with the address of the deployed factory contract
  const factoryAddress = "0xC1e8b127C08aDA6B5c7FfCB237870c304BCd5508";

  const lockerAddress = "0x4ee875d1cd3DC0151332d54c13055A7f69c350Fd";

  const treasuryAddress = "0x6eC4C0C1f5d4066e7499e61dD81583B587aCC098";

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
    lockID,
    isLocked,
    unlockTime,
  ] = await factory.getAllTokens();

  // Print results
  console.log("Addresses:", addresses);
  console.log("Token IDs:", tokenIds);
  console.log("Timestamps:", timestamps);
  console.log("liquidityRemovedStatus:", liquidityRemovedStatus);
  console.log("zeroFeesDays:", zeroFeesDays);
  console.log("istokenDEAD:", istokenDEAD);
  console.log("lastFee:", lastFee);
  console.log("lockID:", lockID);
  console.log("isLocked:", isLocked);
  console.log("unlockTime:", unlockTime);

  // Loop through all tokens to check their launch time

  for (let i = 0; i < addresses.length; i++) {
    // check if it is locked

    if (istokenDEAD[i] == false && isLocked[i] == true) {
      // Collect the fees from the locker
      console.log("Collecting fees...");
      const collectFeesTx = await locker.collectFees(
        tokenIds[i],
        factoryAddress
      );
      await collectFeesTx.wait();
      console.log(`Fees collected for tokenID ${tokenIds[i]}`);

      const feescollectedEvent = await getLatestEvent(locker, "FeesCollected");

      const tokenID = feescollectedEvent.args[0];
      const amount0 = feescollectedEvent.args[1];
      const amount1 = feescollectedEvent.args[2];

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

      if (amount0 <= lastFee[i] && amount1 <= lastFee[i]) {
        await factory.updateNoFeeDays(tokenIds[i]);

        console.log("Updated no fee days");
      } else {
        await factory.resetNoFeeDays(tokenIds[i]);
        console.log("NoFeesDays RESET");
      }
    } else if (istokenDEAD[i] == false && isLocked[i] == false) {
      // Collect the fees from the position
      console.log(
        `Collecting fees for token at address ${addresses[i]} with token ID ${tokenIds[i]}`
      );
      const collectTx = await factory.collectFees(tokenIds[i]);
      await collectTx.wait();
      console.log("Fees collected successfully!");

      const feescollectedEvent = await getLatestEvent(factory, "FeesCollected");

      const tokenID = feescollectedEvent.args[0];
      const amount0 = feescollectedEvent.args[1];
      const amount1 = feescollectedEvent.args[2];

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

      if (amount0 <= lastFee[i] && amount1 <= lastFee[i]) {
        await factory.updateNoFeeDays(tokenIds[i]);
        console.log("Updated no fee days");
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
