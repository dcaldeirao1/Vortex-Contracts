const { ethers } = require("hardhat");

async function main() {
  //Setting contract addresses
  const uniswapV3Factory_address = process.env.SEPOLIA_UNISWAP_FACTORY;
  const positionManager_address = process.env.SEPOLIA_POSITION_MANAGER;
  const swap_router = process.env.SEPOLIA_SWAP_ROUTER;
  const WETH_address = process.env.SEPOLIA_WETH;
  const teamWallet = process.env.TEAM_WALLET;

  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const MyLocker = await ethers.getContractFactory("LiquidityLocker");
  const MyLockerDeployment = await MyLocker.deploy(positionManager_address);

  console.log("MyLocker address:", MyLockerDeployment.target);
  const lockerAddress = MyLockerDeployment.target;

  const MyFactory = await ethers.getContractFactory("MyFactory");
  const myFactory = await MyFactory.deploy(
    positionManager_address,
    WETH_address,
    uniswapV3Factory_address,
    swap_router,
    lockerAddress,
    teamWallet
  );
  const factoryAddress = myFactory.target;
  console.log("MyFactory address:", myFactory.target);

  // Verify Factory
  // npx hardhat verify --network base 0xF686e6CAF7d823E4130339E6f2b02C37836fE90F 0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1 0x4200000000000000000000000000000000000006 0x33128a8fC17869897dcE68Ed026d694621f6FDfD 0x2626664c2603336E57B271c5C0b26F421741e481 0xcfA089cdB2802548772D9e8Cd3425a102044b1FF 0xdc28630221B2d58B8E249Df6d96c928f57bed952

  // Verify Locker
  // npx hardhat verify --network base 0xcfA089cdB2802548772D9e8Cd3425a102044b1FF 0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1

  // Verify Staking
  // npx hardhat verify --network base 0xAC4A1fD60e7a33c4cD89F7D08Dc2D61dB6B940C6 0x4200000000000000000000000000000000000006 0xF686e6CAF7d823E4130339E6f2b02C37836fE90F

  // Verify Treasury
  // npx hardhat verify --network base 0x53996176b6C1Ae12E6deB27F342bD4B25236BA8B 0xF686e6CAF7d823E4130339E6f2b02C37836fE90F

  /* // Wait a few seconds for the contract to be propagated
  await new Promise((r) => setTimeout(r, 60000));

  // Verify the contract
  await hre.run("verify:verify", {
    address: factoryAddress,
    constructorArguments: [
      positionManager_address,
      WETH_address,
      uniswapV3Factory_address,
      swap_router,
      lockerAddress,
      teamWallet,
    ], // Add constructor arguments if any
  }); */

  // Deploy the SimpleStaking contract
  const SimpleStaking = await ethers.getContractFactory("SimpleStaking");
  const staking = await SimpleStaking.deploy(WETH_address, factoryAddress);

  const stakingAddress = staking.target;
  console.log("MyStaking address:", staking.target);

  // Deploy the Treasury contract
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(factoryAddress);

  const treasuryAddress = treasury.target;
  console.log("MyTreasury address:", treasuryAddress);

  const factory = await MyFactory.attach(factoryAddress);
  const locker = await MyLocker.attach(lockerAddress);

  console.log(
    "Setting staking and treasury address in the factory contract..."
  );
  tx3 = await factory.setStakingAndTreasuryAddress(
    stakingAddress,
    treasuryAddress
  );
  await tx3.wait();
  console.log("Done!");

  console.log("Setting factory address in the locker contract...");
  tx2 = await locker.setFactoryAddress(factoryAddress);
  await tx2.wait();
  console.log("Done!");

  // Amount of WETH to send (in Wei)
  const amountInWei = ethers.parseUnits("0.0003", 18);

  /* const txx = await factory.transferWETHToFactory(amountInWei);
  await txx.wait();
  console.log("WETH sent to the factory."); */

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
