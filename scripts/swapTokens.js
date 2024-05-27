
async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Interacting with the factory contract using the account:", deployer.address);

    // Replace this with the address of the deployed factory contract
    const factoryAddress = "0x1b1381E2fb75F74036DFdCC51ACa244FB6946d98";

    const tokenAddress = "0xA269214857Ef9925148b1E246a318BB189E5Dc1D";

    const WETH_address = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14";
    const swapRouterAddress = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";
    
    // Connect to the factory contract using its ABI and address
    const Factory = await ethers.getContractFactory("MyFactory");
    const factory = await Factory.attach(factoryAddress);
    
    // Retrieve the contract address of the deployed token
    const provider = ethers.getDefaultProvider(); // Update with your WebSocket provider URL

    // Amount of ETH to swap
    const amountIn = ethers.parseUnits("0.0001", 18); // 0.01 ETH

    // Approve the SwapRouter to spend your WETH
    console.log("Approving the SwapRouter to spend WETH...");
    const approveTx = await factory.approveToken(WETH_address,swapRouterAddress,amountIn);
    await approveTx.wait();
    console.log("WETH approved for SwapRouter."); 

    const swapTx = await factory.swapETHForToken(tokenAddress, amountIn);
    const swapReceipt = await swapTx.wait();
    console.log("Swap performed successfully!", swapReceipt);

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
