const poolTokenAddresses = [];


async function getPoolCreatedEvent(factory, tokenAddress) {
    // Get the filter for the PoolCreated event
    const filter = factory.filters.PoolCreated();

    // Query the filter for events emitted by the factory contract
    const events = await factory.queryFilter(filter);

    // Log the events array to inspect its contents
    console.log("Events array:", events);

    // Find the PoolCreated event matching the token address
    const poolCreatedEvent = events[events.length - 1]; // Assuming the latest event corresponds to the pool creation

    return poolCreatedEvent;
}


async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Interacting with the factory contract using the account:", deployer.address);

    // Replace this with the address of the deployed factory contract
    const factoryAddress = "0x8c56850571F2f1EDd5De3D96032c626d93F6fC26";

    // Connect to the factory contract using its ABI and address
    const Factory = await ethers.getContractFactory("MyFactory");
    const factory = await Factory.attach(factoryAddress);

    const tokenAddress = "0xDb72B55362Cb2e54EdE9abDa9D67fDB077991d33";
    //const _weth = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14";

    // Create a Uniswap pool paired with ETH
    const poolAddress = await factory.createPoolForToken(tokenAddress);
    

    const receipt = await poolAddress.wait();

    console.log("Pool created successfully!");

    //const pool_Address = "0x8824cb39116c6161620742633DbE94726eB3370E";

    // Get the PoolCreated event emitted by the factory contract
    const poolCreatedEvent = await getPoolCreatedEvent(factory, tokenAddress);

    if (poolCreatedEvent) {
        const pool_Address = poolCreatedEvent.args[1];
        console.log('Pool deployed at:', pool_Address);
        // Store the deployed token address
        poolTokenAddresses.push(pool_Address);
    } else {
        console.error('Pool Creation event not found');
    }

    // Add liquidity to the pool
    //tx = await factory.addInitialLiquidity(tokenAddress, pool_Address);

    

    //console.log("Liquidity added successfully!");
    //console.log("receipt = ",receipt);

    // Check if receipt contains logs
/*if (receipt.logs && receipt.logs.length > 0) {
    // Parse logs to find the LiquidityAdded event
    const liquidityAddedEvent = receipt.logs.find(
        (log) => log.address.toLowerCase() === factoryAddress.toLowerCase() &&
                  log.topics[0] === '0x...' // Replace with the keccak256 hash of the LiquidityAdded event signature
    );

    if (liquidityAddedEvent) {
        // Extract the relevant data from the event
        const token0 = ethers.utils.getAddress('0x' + liquidityAddedEvent.topics[1].slice(-40)); // Token0 address
        const token1 = ethers.utils.getAddress('0x' + liquidityAddedEvent.topics[2].slice(-40)); // Token1 address
        const liquidity = BigNumber.from(liquidityAddedEvent.data); // Liquidity amount
        const poolAddress = ethers.utils.getAddress(liquidityAddedEvent.topics[3]); // Pool address

        console.log('Liquidity Added:');
        console.log('Token0:', token0);
        console.log('Token1:', token1);
        console.log('Liquidity:', liquidity.toString());
        console.log('Pool Address:', poolAddress);
    } else {
        console.error('LiquidityAdded event not found in transaction receipt');
    }
    
} else {
    console.error('No logs found in transaction receipt');
}*/

  


}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
