

async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Interacting with the factory contract using the account:", deployer.address);

    // Replace this with the address of the deployed factory contract
    const factoryAddress = "0xc8C9537a7c26487Fa03DFB24DCC765862aC3982B";

    const stakingAddress = "0x41202d0E5c9CD9afbEf870eae2D6604e8543EC4d";

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

    /* // Deploy the SimpleStaking contract
    const SimpleStaking = await ethers.getContractFactory("SimpleStaking");
    const staking = await SimpleStaking.deploy(WETH_address, factoryAddress);

    // Wait for the deployment transaction to be mined
    const receipt = await staking.deploymentTransaction().wait(2);

    console.log("Transaction receipt:", receipt);
    console.log("Staking contract deployed to:", receipt.contractAddress); */
    

    const rewardAmount = ethers.parseEther("0.0001");
    //const rewardAmount = 0.0001;
    //const rewardAmount = ethers.parseUnits("0.0001", 18);
    

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
