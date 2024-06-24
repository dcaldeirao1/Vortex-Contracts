async function getFeesCollectedEvent(factory) {
    // Get the filter for the PoolCreated event
    const filter = factory.filters.FeesCollected();

    // Query the filter for events emitted by the factory contract
    const events = await factory.queryFilter(filter);

    // Find the PoolCreated event matching the token address
    const FeesCollectedEvent = events[events.length - 1]; // Assuming the latest event corresponds to the pool creation

    return FeesCollectedEvent;
}

async function getTokensSwappedEvent(factory) {
    // Get the filter for the TokenDeployed event
    const filter = factory.filters.TokensSwapped();

    // Query the filter for events emitted by the token contract
    const events = await factory.queryFilter(filter);

    // Find the TokenDeployed event emitted by the token contract
    const tokensSwappedEvent = events[events.length - 1]; // Get the latest event

    return tokensSwappedEvent;
}


async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Interacting with the factory contract using the account:", deployer.address);

    // Replace this with the address of the deployed factory contract
    const factoryAddress = "0xa4593b4a9E5006F1733c5a0f42c5A761041aDbf6";

    const stakingAddress = "0xDc278e2949e4f5117c6328B0Cbb7194cbD7922C4";
    
    const WETH_address = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14";

    // Connect to the factory contract using its ABI and address
    const Factory = await ethers.getContractFactory("MyFactory");
    const factory = await Factory.attach(factoryAddress);
    
    // Fetch all tokens and their timestamps
    const [addresses, tokenIds, timestamps, liquidityRemovedStatus, zeroFeesDays, istokenDEAD] = await factory.getAllTokens();

    // Print results
    console.log("Addresses:", addresses);
    console.log("Token IDs:", tokenIds);
    console.log("Timestamps:", timestamps);
    console.log("liquidityRemovedStatus:", liquidityRemovedStatus);
    console.log("zeroFeesDays:", zeroFeesDays);
    console.log("istokenDEAD:", istokenDEAD);

    // Loop through all tokens to check their launch time
    for (let i = 0; i < addresses.length; i++) {

    if(istokenDEAD[i]==false){

    // Collect the fees from the position
    console.log(`Collecting fees for token at address ${addresses[i]} with token ID ${tokenIds[i]}`);
    const collectTx = await factory.collectFees(tokenIds[i]);
    await collectTx.wait();
    console.log("Fees collected successfully!");
    
    // Get the TokenDeployed event emitted by the token contract
    const feescollectedEvent = await getFeesCollectedEvent(factory);

    const tokenID = feescollectedEvent.args[0];
    const amount0 = feescollectedEvent.args[1];
    const amount1 = feescollectedEvent.args[2];
    console.log("tokenID: ",tokenID);
    console.log("amount0: ",amount0);
    console.log("amount1: ",amount1);

    let token0, token1;
        if (addresses[i].toLowerCase() < WETH_address.toLowerCase()) {
            token0 = addresses[i];
            token1 = WETH_address;
            if(amount0 > 0){

                console.log("Selling with factory function...");
                tx2 = await factory.swapTokensForWETH(amount0, addresses[i]);
                await tx2.wait();
                console.log("Swap performed successfully!");

                const tokensSwappedEvent = await getTokensSwappedEvent(factory);

                const ethReceived = tokensSwappedEvent.args[0];
                const formattedETH = ethers.formatUnits(ethReceived, 18);
                console.log("WETH received: ",formattedETH);
                
                const rewardAmount = ethReceived + amount1;
                console.log("Unwrapping...");
                tx_convert = await factory.convertWETHToETH(rewardAmount);
                await tx_convert.wait();

                // send to staking contract by calling addRewards function
                console.log("Sending fees to the staking contract...");
                tx= await factory.callAddRewards(rewardAmount);
                await tx.wait();
                console.log("Sent to the staking contract!");

            }
    
        } else {
            token0 = WETH_address;
            token1 = addresses[i];
            if(amount1 > 0){

                console.log("Selling with factory function...");
                tx2 = await factory.swapTokensForWETH(amount0, addresses[i]);
                await tx2.wait();
                console.log("Swap performed successfully!");

                const tokensSwappedEvent = await getTokensSwappedEvent(factory);

                const ethReceived = tokensSwappedEvent.args[0];
                const formattedETH = ethers.formatUnits(ethReceived, 18);
                console.log("WETH received: ", formattedETH);

                const rewardAmount = ethReceived + amount0;
                console.log("Unwrapping...");
                tx_convert = await factory.convertWETHToETH(rewardAmount);
                await tx_convert.wait();

                // send to staking contract by calling addRewards function
                console.log("Sending fees to the staking contract...");
                tx= await factory.callAddRewards(rewardAmount);
                await tx.wait();
                console.log("Sent to the staking contract!");

            }

        }
    

    if(amount0 == 0 && amount1 == 0 ){

        await factory.updateNoFeeDays(tokenIds[i]);         

    } else {

       await factory.resetNoFeeDays(tokenIds[i]); 
       //console.log('Token is dead');
       console.log('NoFeesDays Reset');
    }

    } else{

        console.log('Dead token');
          }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
