const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Removing liquidity with the account:", deployer.address);

    const factoryAddress = "0xb92837d57943dD616cC65633b3C60688FC2b388F";
    const tokenId = 16292; // The token ID of the liquidity position

    const Factory = await hre.ethers.getContractFactory("MyFactory");
    const factory = await Factory.attach(factoryAddress);

    // Fetch the position details
    const position = await factory.getPosition(tokenId);
    const liquidity = position.liquidity;
    const token0 = position.token0;
    const token1 = position.token1;

    console.log(`Position Details:`, position);
    console.log("token0 = ",token0);
    console.log("token1 = ",token1);
    console.log("Liquidity = ",liquidity);

    // Determine the correct pool address
    const poolAddress = await factory.get_Pool(token0, token1, 10000);

    // Fetch pool state (price, liquidity, etc.)
    const poolContract = await ethers.getContractAt("IUniswapV3Pool", poolAddress);
    const slot0 = await poolContract.slot0();
    const sqrtPriceX96 = slot0.sqrtPriceX96;
    const price = ((BigInt(sqrtPriceX96)* (10n ** 9n) / (2n ** 96n))** 2n) ;

    console.log(`Pool Address: ${poolAddress}`);
    console.log(`Sqrt Price X96: ${sqrtPriceX96}`);
    console.log(`Price: ${price}`);

    // Calculate liquidity to remove based on desired amount of WETH
    const wethAmountToRemove = ethers.parseUnits("0.01", 18); // 0.1 WETH

    // Calculate the corresponding amount of tokens to remove
    const tokensToRemove = wethAmountToRemove * price;

    // Calculate the liquidity to remove
    //const liquidityToRemove = sqrt(wethAmountToRemove/price * tokensToRemove);

    // Calculate the corresponding liquidity to remove
    const liquidityToRemove = calculateLiquidityToRemove(wethAmountToRemove, liquidity, price);

    // Ensure liquidity to remove is not greater than the available liquidity
    //const liquidityToRemoveSafe = liquidityToRemove > liquidity ? liquidity : liquidityToRemove;

    console.log(`Calculated Liquidity to Remove: ${liquidityToRemove.toString()}`);
    //console.log(`Adjusted Liquidity to Remove (Safe): ${liquidityToRemoveSafe.toString()}`);


     // Remove liquidity
     const tx = await factory.removeLiquidity(tokenId, liquidityToRemove);
     const receipt = await tx.wait();
 

    console.log("Liquidity removed successfully!");
    console.log("Receipt:", receipt);
}

/*function calculateLiquidityToRemove(wethAmountToRemove, price) {
    // Calculate the corresponding liquidity to remove
    // L = wethAmountToRemove / sqrt(price)
    const sqrtPrice = sqrt(price);
    const liquidityToRemove = (wethAmountToRemove * (2n ** 96n)) / sqrtPrice;
    return liquidityToRemove;
}*/

function calculateLiquidityToRemove(ethAmount, totalLiquidity, price) {
    // Calculate the corresponding liquidity to remove
    // L = ethAmount / sqrt(price)
    const sqrtPrice = sqrt(price);
    const liquidityFraction = (ethAmount * (2n ** 96n)) / sqrtPrice;
    const liquidityToRemove = (liquidityFraction * totalLiquidity) / (totalLiquidity + liquidityFraction);
    return liquidityToRemove;
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

function sqrt(value) {
    if (value < 0n) {
        throw new Error("Square root of negative numbers is not supported");
    }
    if (value === 0n) return 0n;
    let z = value;
    let x = value / 2n + 1n;
    while (x < z) {
        z = x;
        x = (value / x + x) / 2n;
    }
    return z;
}
