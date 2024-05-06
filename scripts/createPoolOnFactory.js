

async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Interacting with the factory contract using the account:", deployer.address);

    // Replace this with the address of the deployed factory contract
    const factoryAddress = "0x59e70a5DA582ca4d9dEF1Cc1c8D3669D40e1923D";

    // Connect to the factory contract using its ABI and address
    const Factory = await ethers.getContractFactory("MyFactory");
    const factory = await Factory.attach(factoryAddress);

    const tokenAddress = "0x8db9eBEadD63192B0848A51E02fc6D6C8b0A84f4";
    //const _weth = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14";

    // Create a Uniswap pool paired with ETH
    //const poolAddress = await factory.createPoolForToken(tokenAddress);
    //console.log("Pool created at address:", poolAddress);

    const pool_Address = "0x667EB9B0d91D3bb9c080486bc96c21CAB9CAFa85";

    // Add liquidity to the pool
    await factory.addInitialLiquidity(tokenAddress, pool_Address);
    console.log("Liquidity added successfully!");
  


}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
