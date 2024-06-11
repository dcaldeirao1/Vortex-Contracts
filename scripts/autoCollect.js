async function getFeesCollectedEvent(factory) {
    // Get the filter for the PoolCreated event
    const filter = factory.filters.FeesCollected();

    // Query the filter for events emitted by the factory contract
    const events = await factory.queryFilter(filter);

    // Log the events array to inspect its contents
    //console.log("Events array:", events);

    // Find the PoolCreated event matching the token address
    const FeesCollectedEvent = events[events.length - 1]; // Assuming the latest event corresponds to the pool creation

    return FeesCollectedEvent;
}


async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Interacting with the factory contract using the account:", deployer.address);

    // Replace this with the address of the deployed factory contract
    const factoryAddress = "0x48419ba6b356065f13df1B3d000e8cd3105Cb7d9";

    //const tokenId = 16453;
    
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

    //const [uncollectedFeesToken0, uncollectedFeesToken1] = await factory.checkUncollectedFees("16499");

    //if (uncollectedFeesToken0 > 0 || uncollectedFeesToken1 > 0){

    if(istokenDEAD[i]==false){
    // Collect the fees from the position
    console.log(`Collecting fees for token at address ${addresses[i]} with token ID ${tokenIds[i]}`);
    const collectTx = await factory.collectFees(tokenIds[i]);
    receipt = await collectTx.wait();
    console.log("Fees collected successfully!");
    //console.log("Transaction receipt:", receipt);
    
    // Get the TokenDeployed event emitted by the token contract
    const feescollectedEvent = await getFeesCollectedEvent(factory);

    const tokenID = feescollectedEvent.args[0];
    const amount0 = feescollectedEvent.args[1];
    const amount1 = feescollectedEvent.args[2];
    console.log("tokenID: ",tokenID);
    console.log("amount0: ",amount0);
    console.log("amount1: ",amount1);

    if(amount0 == 0 && amount1 == 0 ){

        await factory.updateNoFeeDays(tokenIds[i]);         // zerofeedaysVector[tokenIds[i]]++

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
