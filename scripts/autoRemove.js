const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Removing liquidity with the account:", deployer.address);

  const factoryAddress = "0xB274EBe5EEc2FD4d44336cd25118611FDAFd01AF";

  const lockerAddress = "0x75afe9B972a4aBD8baCa1c42558eAd1c89A7A697";

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
