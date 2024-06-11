const { ethers } = require('hardhat');


async function getLiquidityLockedEvent(locker) {
    // Get the filter for the PoolCreated event
    const filter = locker.filters.LiquidityLocked();

    // Query the filter for events emitted by the factory contract
    const events = await locker.queryFilter(filter);

    // Log the events array to inspect its contents
    //console.log("Events array:", events);

    // Find the PoolCreated event matching the token address
    const LiquidityLockedEvent = events[events.length - 1]; // Assuming the latest event corresponds to the pool creation

    return LiquidityLockedEvent;
}

async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Using the account:", deployer.address);

    // Addresses of the deployed contracts
    const factoryAddress = '0x81f155Fc589a2Fc6229a110312FEf0fD35864DAb';
    const lockerAddress = '0x3d334C579dDff4ffB4efC3C560CE4dEc2E72cc58';
    const nftAddress = '0x1238536071E1c677A632429e3655c799b22cDA52'; // This would be dynamically obtained after adding liquidity

    // Connect to the contracts
    const Factory = await ethers.getContractFactory("MyFactory");
    const LiquidityLocker = await ethers.getContractFactory("LiquidityLocker");

    const factory = await Factory.attach(factoryAddress);
    const locker = await LiquidityLocker.attach(lockerAddress);

    // Retrieve the token ID from the event (assuming your factory emits an event with the token ID)
    const tokenId = 16538;

    // Connect to the NFT contract
    const NFT = await ethers.getContractAt("IERC721", nftAddress, deployer);

    // Approve the LiquidityLocker contract to manage the NFT
    /* console.log("Approving the LiquidityLocker to manage the NFT...");
    const approvalTx = await NFT.approve(lockerAddress, tokenId);
    await approvalTx.wait();
    console.log("Approval successful!"); */ 

    /* // Approve the locker to manage the NFT
    console.log("Approving LiquidityLocker to manage the factory NFT...");
    const approveTx = await factory.approveNFT(nftAddress, tokenId, lockerAddress);
    await approveTx.wait();
    console.log("Approval successful.");


    // Lock the liquidity
    console.log("Locking liquidity...");
    //const duration = 3600 * 24 * 7; // 1 week in seconds
    const duration = 120;
    const lockLiquidityTx = await locker.lockLiquidity(nftAddress, tokenId, duration, factoryAddress);
    receipt = await lockLiquidityTx.wait();

    console.log("Liquidity locked for 1 week.");


    // Get the TokenDeployed event emitted by the token contract
    const liquidityLockedEvent = await getLiquidityLockedEvent(locker);

    const lockId = liquidityLockedEvent.args[0];
    console.log("lockId: ",lockId); */

    const lockId = 1;
    
    // Unlock the liquidity
    console.log("Unlocking liquidity...");
    //const duration = 3600 * 24 * 7; // 1 week in seconds
    const unlockLiquidityTx = await locker.unlockLiquidity(lockId, factoryAddress);
    await unlockLiquidityTx.wait();

    console.log("Liquidity unlocked");

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });
