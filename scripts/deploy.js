async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
  
    const MyLocker = await ethers.getContractFactory("LiquidityLocker");
    const MyLockerDeployment = await MyLocker.deploy();
  
    if (MyLockerDeployment) {
      // If successful, print contract address
      console.log("MyLocker address:", MyLockerDeployment.target);
  } else {
      // If unsuccessful, log an error
      console.error("MyLocker deployment failed");
      return; // Exit the function
  }
    //SEPOLIA
    const uniswapV3Factory_address = "0x0227628f3F023bb0B980b67D528571c95c6DaC1c";
    const positionManager_address = "0x1238536071E1c677A632429e3655c799b22cDA52";
    const WETH_address = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14";
    const swap_router = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";
    
/*
    //BASE
    const uniswapV3Factory_address = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";
    const positionManager_address = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
    const WETH_address = "0x4200000000000000000000000000000000000006";
    const swap_router = "0x2626664c2603336E57B271c5C0b26F421741e481"; */

    

    const MyFactory = await ethers.getContractFactory("MyFactory");
    const myFactory = await MyFactory.deploy(positionManager_address, WETH_address, uniswapV3Factory_address, swap_router);
    const factoryAddress = myFactory.target;
    console.log("MyFactory address:", myFactory.target);

    // Deploy the SimpleStaking contract
    const SimpleStaking = await ethers.getContractFactory("SimpleStaking");
    const staking = await SimpleStaking.deploy(WETH_address, factoryAddress);

    const stakingAddress = staking.target;
    console.log("MyStaking address:", staking.target);

    const factory = await MyFactory.attach(factoryAddress);

    console.log("Setting staking address in the factory contract...");
    tx2 = await factory.setStakingAddress(stakingAddress);
    await tx2.wait();
    console.log("Done!");

  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    }); 
  