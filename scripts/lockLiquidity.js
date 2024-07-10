const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Using the account:", deployer.address);

  // Addresses of the deployed contracts
  const factoryAddress = "0xE2b029b5968d32cf67A4407FD788bac5953c7820";
  const lockerAddress = "0x26Ca8a1e9E3a78761B81C3b587C7715BD31F49f8";
  const position_manager = process.env.SEPOLIA_POSITION_MANAGER; // This would be dynamically obtained after adding liquidity

  // Retrieve the token ID from the event (assuming your factory emits an event with the token ID)
  const tokenId = 17713;

  // Connect to the contracts
  const Factory = await ethers.getContractFactory("MyFactory");
  const LiquidityLocker = await ethers.getContractFactory("LiquidityLocker");

  const factory = await Factory.attach(factoryAddress);
  const locker = await LiquidityLocker.attach(lockerAddress);

  /* // Approve the locker to manage the NFT
    console.log("Approving LiquidityLocker to manage the factory NFT...");
    const approveTx = await factory.approveNFT(tokenId, lockerAddress);
    await approveTx.wait();
    console.log("Approval successful.");


    // Lock the liquidity
    console.log("Locking liquidity...");
    //const duration = 3600 * 24 * 7; // 1 week in seconds
    const duration = 120;
    const lockLiquidityTx = await locker.lockLiquidity(position_manager, tokenId, duration, factoryAddress);
    receipt = await lockLiquidityTx.wait(); 

    console.log("Liquidity locked for 1 week.");


    // Get the TokenDeployed event emitted by the token contract
    const liquidityLockedEvent = await getLiquidityLockedEvent(locker);

    const lockId = liquidityLockedEvent.args[0];
    console.log("lockId: ",lockId); */

  const lockId = 0;

  // Unlock the liquidity
  console.log("Unlocking liquidity...");
  //const duration = 3600 * 24 * 7; // 1 week in seconds
  const unlockLiquidityTx = await locker.unlockLiquidity(
    lockId,
    factoryAddress
  );
  await unlockLiquidityTx.wait();

  console.log("Liquidity unlocked");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
