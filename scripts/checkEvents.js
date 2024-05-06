const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {

    // Replace this with the address of your deployed factory contract
    const factoryAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

    const tokenName = "Etnica";
    const tokenSymbol = "ET";
    const tokenSupply = 30000;

    // Connect to the factory contract using its ABI and address
    const Factory = await ethers.getContractFactory("MyFactory");
    const factory = await Factory.attach(factoryAddress);

    // Use Hardhat's default provider
    const provider = ethers.getDefaultProvider();

    // Read the JSON file
    const myFactoryJson = JSON.parse(fs.readFileSync("artifacts/contracts/TestFactory.sol/MyFactory.json", "utf8"));

    // Get the ABI from the JSON object
    const factoryAbi = myFactoryJson.abi;

    //console.log("factoryAbi = ",factoryAbi);

    const factoryContract = new ethers.Contract(factoryAddress, factoryAbi, provider);

    // Listen for events emitted by the factory contract
    factoryContract.on("TokenDeployed", (tokenAddress, event) => {
        console.log("Token deployed at address:", tokenAddress);
    });

    console.log("Listening for TokenDeployed event...");

    // Wait for a short period to ensure the event listener is set up
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Call the deployToken function of the factory contract
    const tx = await factory.deployToken(tokenName, tokenSymbol, tokenSupply);

    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log("Token deployed successfully!");

    console.log("receipt = ",receipt);

    console.log(receipt.events?.filter((x) => {return x.event == "TokenDeployed"}));

    const filter = factoryContract.filters.TokenDeployed();
    const logs = await factoryContract.queryFilter(filter);
    console.log("TokenDeployed Event Logs:", logs);

}

main()
    .then(() => console.log("Script started."))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });
