const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Removing liquidity with the account:", deployer.address);

    const factoryAddress = "0xBbeAA4DE58D1E863340d7C770C1fb150CA456Da5";
    const tokenAddress = "0x25C600819aa2313DcEa2b693253111C566740175";
    const tokenId = 16525; // The token ID of the liquidity position

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
    const price = ((BigInt(sqrtPriceX96))**2n) * (10n ** 18n)/ (2n ** 192n) ;
    //const price = _price / (10n ** 18n);

    console.log(`Pool Address: ${poolAddress}`);
    console.log(`Sqrt Price X96: ${sqrtPriceX96}`);
    //console.log(`_Price: ${_price}`);
    console.log(`Price: ${price}`);

    // Calculate liquidity to remove based on desired amount of WETH
    const wethAmountToRemove = ethers.parseUnits("0.0001", 18); // 0.1 WETH

    // Calculate the corresponding amount of tokens to remove
    const tokensToRemove = wethAmountToRemove * (10n ** 18n) / price;
    console.log("tokensToRemove = ",tokensToRemove);

    // Calculate the liquidity to remove (SQRT)
    const liquidityToRemove = sqrt(wethAmountToRemove * tokensToRemove);
    console.log(`Calculated Liquidity to Remove: ${liquidityToRemove.toString()}`);

    // Ensure liquidity to remove is not greater than the available liquidity
    const liquidityToRemoveSafe = liquidityToRemove > liquidity ? liquidity : liquidityToRemove;

     // Remove liquidity
     const tx = await factory.removeLiquidity(tokenId, liquidityToRemoveSafe, tokenAddress);
     const receipt = await tx.wait();
 

    console.log("Liquidity removed successfully!");
    console.log("Receipt:", receipt);
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