const poolTokenAddresses = [];


async function getTokenApprovedEvent(factory) {
    // Get the filter for the PoolCreated event
    const filter = factory.filters.TokenApproved();

    // Query the filter for events emitted by the factory contract
    const events = await factory.queryFilter(filter);

    // Log the events array to inspect its contents
    console.log("Events array:", events);

    // Find the PoolCreated event matching the token address
    const tokenApprovedEvent = events[events.length - 1]; // Assuming the latest event corresponds to the pool creation

    return tokenApprovedEvent;
}

async function getLiquidityAddedEvent(factory) {
    // Get the filter for the PoolCreated event
    const filter = factory.filters.LiquidityAdded();

    // Query the filter for events emitted by the factory contract
    const events = await factory.queryFilter(filter);

    // Log the events array to inspect its contents
    //console.log("Events array:", events);

    // Find the PoolCreated event matching the token address
    const liquidityAddedEvent = events[events.length - 1]; // Assuming the latest event corresponds to the pool creation

    return liquidityAddedEvent;
}


async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Interacting with the factory contract using the account:", deployer.address);

    // Replace this with the address of the deployed factory contract
    const factoryAddress = "0xf490f0ceeeb9AC8295797DB594b9827CAAacdAFC";

    // Connect to the factory contract using its ABI and address
    const Factory = await ethers.getContractFactory("MyFactory");
    const factory = await Factory.attach(factoryAddress);

    const tokenAddress = "0xebdb60A3194aa8E3c1D0471180D09F223A3514D8";

    //const pool_Address = "0x1c00Afa3Ba73471359661C537c036CA5915A4330";
    const pool_Address = "0x77B30a4D721cbFE229f5Ad33077bDC5D763c9838";

    const WETH_address = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14";
    const positionManager_address = "0x1238536071E1c677A632429e3655c799b22cDA52";

    const amountToApprove = 30000;
    await factory.approveToken(tokenAddress, factoryAddress, amountToApprove); // Approve tokens for the factory contract
    await factory.approveToken(WETH_address, factoryAddress, 1); // Approve tokens for the factory contract

    // Approve tokens and WETH for the factory contract
    //await tokenContract.approve(factoryAddress, amountToApprove);
    //await wethContract.approve(factoryAddress, 1);



    // Add liquidity to the pool
    tx = await factory.addInitialLiquidity(tokenAddress, pool_Address, factoryAddress);

    const receipt = await tx.wait();

    console.log("Liquidity added successfully!");

    console.log("receipt = ",receipt);

    // Get the PoolCreated event emitted by the factory contract
    const tokenApprovedEvent = await getTokenApprovedEvent(factory);

    if (tokenApprovedEvent) {
        //const pool_Address = tokenApprovedEvent.args[1];
        console.log('Token Approved Successfully');
        
    } else {
        console.error('TokenApproved event not found');
    }

    

    

  


}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
