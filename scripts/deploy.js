async function main() {
  //Setting contract addresses
  const uniswapV3Factory_address = process.env.SEPOLIA_UNISWAP_FACTORY;
  const positionManager_address = process.env.SEPOLIA_POSITION_MANAGER;
  const swap_router = process.env.SEPOLIA_SWAP_ROUTER;
  const WETH_address = process.env.SEPOLIA_WETH;

  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const MyLocker = await ethers.getContractFactory("LiquidityLocker");
  const MyLockerDeployment = await MyLocker.deploy(positionManager_address);

  if (MyLockerDeployment) {
    // If successful, print contract address
    console.log("MyLocker address:", MyLockerDeployment.target);
  } else {
    // If unsuccessful, log an error
    console.error("MyLocker deployment failed");
    return;
  }

  const MyFactory = await ethers.getContractFactory("MyFactory");
  const myFactory = await MyFactory.deploy(
    positionManager_address,
    WETH_address,
    uniswapV3Factory_address,
    swap_router
  );
  const factoryAddress = myFactory.target;
  console.log("MyFactory address:", myFactory.target);

  // Deploy the SimpleStaking contract
  const SimpleStaking = await ethers.getContractFactory("SimpleStaking");
  const staking = await SimpleStaking.deploy(WETH_address, factoryAddress);

  const stakingAddress = staking.target;
  console.log("MyStaking address:", staking.target);

  // Deploy the Treasury contract
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(factoryAddress);

  const treasuryAddress = treasury.target;
  console.log("MyTreasury address:", treasury.target);

  const factory = await MyFactory.attach(factoryAddress);

  const treasure = await Treasury.attach(treasuryAddress);

  console.log("Setting staking address in the factory contract...");
  tx2 = await factory.setStakingAddress(stakingAddress);
  await tx2.wait();
  console.log("Done!");

  // Amount of WETH to send (in Wei)
  const amountInWei = ethers.parseUnits("0.0003", 18); // Replace "0.1" with the desired amount of WETH

  // WETH ABI
  const WETHAbi = require("../scripts/WETHabi.json");

  // Get the WETH contract instance
  const WETH = new ethers.Contract(WETH_address, WETHAbi, deployer);

  // Check WETH balance of deployer
  const balance = await WETH.balanceOf(deployer.address);
  console.log(`Deployer WETH balance: ${ethers.formatUnits(balance, 18)} WETH`);

  // Approve the factory contract to spend WETH on behalf of deployer
  const approveTx = await WETH.approve(factoryAddress, amountInWei);
  await approveTx.wait();
  console.log(
    `Approved ${ethers.formatUnits(
      amountInWei,
      18
    )} WETH to the factory contract`
  );

  // Transfer WETH to the factory contract
  const transferTx = await WETH.transfer(factoryAddress, amountInWei);
  await transferTx.wait();
  console.log(
    `Transferred ${ethers.formatUnits(
      amountInWei,
      18
    )} WETH to the factory contract`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
