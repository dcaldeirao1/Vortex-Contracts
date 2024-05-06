//const { ethers } = require("ethers");
const fs = require("fs");

async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Interacting with the factory contract using the account:", deployer.address);

    // Replace these with your desired token name, symbol, and total supply
    const tokenName = "Etnica";
    const tokenSymbol = "ET";
    const tokenSupply = 30000;

    // Read the JSON file
    const myFactoryJson = JSON.parse(fs.readFileSync("artifacts/contracts/TestFactory.sol/MyFactory.json", "utf8"));

    // Get the ABI from the JSON object
    const factoryAbi = myFactoryJson.abi;

    // Replace this with the address of the deployed factory contract
    //const factoryAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const factoryAddress = "0x59e70a5DA582ca4d9dEF1Cc1c8D3669D40e1923D";

    // Connect to the factory contract using its ABI and address
    const Factory = await ethers.getContractFactory("MyFactory");
    const factory = await Factory.attach(factoryAddress);
    

    // Retrieve the contract address of the deployed token
    const provider = ethers.getDefaultProvider(); // Update with your WebSocket provider URL
    const factoryContract = new ethers.Contract(factoryAddress, factoryAbi, provider);

    // Listen for events emitted by the factory contract
    factoryContract.on("TokenDeployed", (tokenAddress, event) => {
        console.log("Token deployed at address:", tokenAddress);
        process.exit(0); // Exit the script once the event is received
    });


    // Call the deployToken function of the factory contract
    const tx = await factory.deployToken(tokenName, tokenSymbol, tokenSupply);

    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log("Token deployed successfully!");    


}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
