const poolTokenAddresses = [];


async function getTokenApprovedEvent(factory) {
    // Get the filter for the PoolCreated event
    const filter = factory.filters.PoolCreated();

    // Query the filter for events emitted by the factory contract
    const events = await factory.queryFilter(filter);

    // Log the events array to inspect its contents
    //console.log("Events array:", events);

    // Find the PoolCreated event matching the token address
    const tokenApprovedEvent = events[events.length - 1]; // Assuming the latest event corresponds to the pool creation

    return tokenApprovedEvent;
}

async function getLiquidityAddedEvent(factory) {
    // Get the filter for the PoolCreated event
    const filter = factory.filters.PoolCreated();

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
    const factoryAddress = "0x8c56850571F2f1EDd5De3D96032c626d93F6fC26";

    // Connect to the factory contract using its ABI and address
    const Factory = await ethers.getContractFactory("MyFactory");
    const factory = await Factory.attach(factoryAddress);

    const pool_Address = "0xDFC03b12131e56fc8A2184C5F58c392E1D49DCa4";
    const tokenAddress = "0xDb72B55362Cb2e54EdE9abDa9D67fDB077991d33";



    // Add liquidity to the pool
    tx = await factory.addInitialLiquidity(tokenAddress, pool_Address);

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
