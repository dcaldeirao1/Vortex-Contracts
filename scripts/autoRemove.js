const hre = require("hardhat");
const { ethers } = hre;

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
  console.log("Removing liquidity with the account:", deployer.address);

  const factoryAddress = "0xeDd1c182a8340c3B1fBD1bd74da303a8CbAe0b4f";

  const lockerAddress = "0x5b52b749c1a30F34EEbD9A9abdC2311E3206f3Ab";

  const position_manager = process.env.SEPOLIA_POSITION_MANAGER;

  const Factory = await hre.ethers.getContractFactory("MyFactory");
  const factory = await Factory.attach(factoryAddress);

  const LiquidityLocker = await ethers.getContractFactory("LiquidityLocker");
  const locker = await LiquidityLocker.attach(lockerAddress);

  const [
    addresses,
    poolAddresses,
    tokenCreators,
    tokenIds,
    timestamps,
    liquidityRemovedStatus,
    zeroFeesDays,
    isInactive,
    lastFee,
    lockID,
    isLocked,
    unlockTime,
    isDead,
  ] = await factory.getAllTokens();

  // Print results
  console.log("Addresses:", addresses);
  console.log("poolAddresses: ", poolAddresses);
  console.log("tokenCreators: ", tokenCreators);
  console.log("Token IDs:", tokenIds);
  console.log("Timestamps:", timestamps);
  console.log("liquidityRemovedStatus:", liquidityRemovedStatus);
  console.log("lockID:", lockID);
  console.log("isLocked:", isLocked);
  console.log("unlockTime:", unlockTime);
  console.log("isDead:", isDead);

  const currentTime = Math.floor(Date.now() / 1000); // current time in seconds since Unix epoch

  // Loop through all tokens to check their launch time
  for (let i = 0; i < addresses.length; i++) {
    // Check if the token's initial liquidity has already been removed and if the locktime has passed

    if (!liquidityRemovedStatus[i] && currentTime > unlockTime[i]) {
      console.log("Removing initial liquidity and relocking...");
      const tx = await factory.removeInitialLiquidity(tokenIds[i], lockID[i]); // Remove the initial liq provided and relock
      const receipt = await tx.wait();
      console.log("Success.");
    } else if (
      liquidityRemovedStatus[i] == true &&
      isInactive[i] == true &&
      currentTime > unlockTime[i] &&
      isDead[i] == false
    ) {
      console.log("Removing all liquidity and marking token as dead...");
      const tx = await factory.removeDeadLiquidity(tokenIds[i], lockID[i]); // Remove the remaining liquidity when a token dies
      const receipt = await tx.wait();
      console.log("Success.");
    } else if (
      liquidityRemovedStatus[i] == true &&
      isInactive[i] == false &&
      currentTime > unlockTime[i] &&
      isDead[i] == false
    ) {
      console.log("Relocking liquidity...");
      const tx = await factory.relock(tokenIds[i], lockID[i]); // Relock liquidity for 1 month
      const receipt = await tx.wait();
      console.log("Done");
    } else {
      console.log(
        `Token at address ${addresses[i]} with token ID ${tokenIds[i]} is still locked or dead.`
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
