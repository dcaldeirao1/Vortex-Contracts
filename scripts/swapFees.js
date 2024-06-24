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
    const factoryAddress = "0x16ADD9b5EC93094Ee3fC371F7AEAb7284270FD27";

    const stakingAddress = "0xf4f9449CA2cE68e79CA30d2B45D3c554Ad13841b";

    const MyContract = require('../scripts/swapRouterABI.json');
    const abi = MyContract;
    
    const WETH_address = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14";
    const swapRouterAddress = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";

    const swapRouter = new ethers.Contract(swapRouterAddress, abi, deployer);

    // ABI of the ERC20 token contract, you can use a minimal ABI just to interact with balanceOf
    const erc20Abi = [
    "function balanceOf(address account) external view returns (uint256)"
    ];
    
    // Connect to the factory contract using its ABI and address
    const Factory = await ethers.getContractFactory("MyFactory");
    const factory = await Factory.attach(factoryAddress);
    
    // Fetch all tokens and their timestamps
    const [addresses, tokenIds, timestamps, liquidityRemovedStatus, zeroFeesDays, istokenDEAD] = await factory.getAllTokens();

    // Loop through all tokens 
    for (let i = 0; i < addresses.length; i++) {

    //check factory balance for addresses[i]

    // Connect to the token contract
    const tokenContract = new ethers.Contract(addresses[i], erc20Abi, deployer);

    // Query the balance of the factory contract
    const balance = await tokenContract.balanceOf(factoryAddress);

    console.log("balance = ", balance);
    
    // Format the balance using the appropriate decimals (assuming 18 decimals here)
    const formattedBalance = ethers.formatUnits(balance, 18);

    console.log(`Balance of token ${addresses[i]} in factory contract: ${formattedBalance}`);
    // if factory has tokens then sell it to eth

    if(formattedBalance > 0 ){
    
    console.log("Selling with factory function...");
    tx2 = await factory.swapTokensForWETH(balance, addresses[i]);
    const receipt6 = await tx2.wait();
    console.log("Swap performed successfully!");
    
    // Get the TokenDeployed event emitted by the token contract
    const tokensSwappedEvent = await getTokensSwappedEvent(factory);

    const ethReceived = tokensSwappedEvent.args[0];
    console.log("ETH received: ",ethReceived);

    // Format the balance using the appropriate decimals (assuming 18 decimals here)
    const formattedETH = ethers.formatUnits(ethReceived, 18);
    console.log("formattedETH = ", formattedETH);

    

}

    
    }

    const rewardAmount = ethers.parseEther("0.0001"); 

    console.log("Setting staking address in the factory contract...");
    tx2 = await factory.setStakingAddress(stakingAddress);
    await tx2.wait();

    // send to staking contract by calling addRewards function
    console.log("Adding Rewards...");
    tx= await factory.callAddRewards(rewardAmount);
    const receipt3 = await tx.wait();
    console.log("Sent to the staking contract!");

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
