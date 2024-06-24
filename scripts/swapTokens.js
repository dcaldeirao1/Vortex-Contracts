

async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Interacting with the factory contract using the account:", deployer.address);

    // Replace this with the address of the deployed factory contract
    const factoryAddress = "0x78Eb67EBa440bB9cE62A39a2ed93BDeED641f7aB";

    const tokenAddress = "0xF90f1eAD1D91971810216Ff388Fe4e998fbe8414";

    const abi = require('../scripts/swapRouterABI.json');
    
    const WETH_address = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14";
    const swapRouterAddress = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";
    
    // Connect to the factory contract using its ABI and address
    const Factory = await ethers.getContractFactory("MyFactory");
    const factory = await Factory.attach(factoryAddress);
    
    const swapRouter = new ethers.Contract(swapRouterAddress, abi, deployer);


    // Amount of ETH to swap
    const amountIn = ethers.parseUnits("0.1", 18); // 0.01 ETH
    // Amount of Tokens to swap
    const amountIn2 = ethers.parseUnits("60", 18); // 0.01 ETH
    
    /* // Swap parameters
    const params = {
        tokenIn: WETH_address,
        tokenOut: tokenAddress,
        fee: 10000, // Assuming 1% fee tier
        recipient: deployer.address,
        deadline: Math.floor(Date.now() / 1000) + (60 * 10), // 10 minutes from now
        amountIn: amountIn,
        amountOutMinimum: 0, // Set to 0 for simplicity, you may want to set a minimum amount out to avoid front-running
        sqrtPriceLimitX96: 0 // No price limit
    };

    // Perform the swap
    console.log("Performing the swap from ETH to the token...");
    const tx = await swapRouter.exactInputSingle(params, { value: amountIn });
    await tx.wait();
    console.log("Swap performed successfully!"); */


    console.log("Buying with factory function...");
    tx1 = await factory.swapETHforTokens(amountIn, tokenAddress, { value: amountIn });
    receipt = await tx1.wait();
    console.log("Swap performed successfully!");
    

    /* console.log("Selling with factory function...");
    tx2 = await factory.swapTokensForWETH(amountIn2, tokenAddress, { value: amountIn2 });
    receipt = await tx2.wait();
    console.log("Swap performed successfully!"); */
    

    /* // Approve the SwapRouter to spend your tokens
    console.log("Approving the SwapRouter to spend tokens...");
    const tokenContract = await ethers.getContractAt("IERC20", tokenAddress, deployer);
    const approveTx = await tokenContract.approve(swapRouterAddress, amountIn2);
    await approveTx.wait();
    console.log("Tokens approved for SwapRouter.");
    
    // Swap parameters
    const params2 = {
        tokenIn: tokenAddress,
        tokenOut: WETH_address,
        fee: 10000, // Assuming 1% fee tier
        recipient: deployer.address,
        deadline: Math.floor(Date.now() / 1000) + (60 * 10), // 10 minutes from now
        amountIn: amountIn2,
        amountOutMinimum: 0, // Set to 0 for simplicity, you may want to set a minimum amount out to avoid front-running
        sqrtPriceLimitX96: 0 // No price limit
    };


    // Perform the swap
    console.log("Performing the swap from Tokens to ETH...");
    const tx2 = await swapRouter.exactInputSingle(params2);
    await tx2.wait();
    console.log("Swap performed successfully!"); */

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
