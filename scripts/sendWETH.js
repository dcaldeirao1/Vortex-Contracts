const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();

    // Address of the deployed factory contract
    const factoryAddress = "0x04Ff8A563F2e263c83D0594308b21484F25E161A"; // Replace with your factory contract address

    // Address of the WETH contract
    const WETH_Address = process.env.SEPOLIA_WETH; // Replace with the WETH contract address

    // Amount of WETH to send (in Wei)
    const amountInWei = ethers.parseUnits("0.0001", 18); // Replace "0.1" with the desired amount of WETH

    // WETH ABI
    const WETHAbi = require("../scripts/WETHabi.json");

    // Get the WETH contract instance
    const WETH = new ethers.Contract(WETH_Address, WETHAbi, deployer);

    // Check WETH balance of deployer
    const balance = await WETH.balanceOf(deployer.address);
    console.log(`Deployer WETH balance: ${ethers.formatUnits(balance, 18)} WETH`);

    // Approve the factory contract to spend WETH on behalf of deployer
    const approveTx = await WETH.approve(factoryAddress, amountInWei);
    await approveTx.wait();
    console.log(`Approved ${ethers.formatUnits(amountInWei, 18)} WETH to the factory contract`);

    // Transfer WETH to the factory contract
    const transferTx = await WETH.transfer(factoryAddress, amountInWei);
    await transferTx.wait();
    console.log(`Transferred ${ethers.formatUnits(amountInWei, 18)} WETH to the factory contract`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
