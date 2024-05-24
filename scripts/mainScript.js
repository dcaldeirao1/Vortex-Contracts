//const ethers = require("hardhat");
const { spawn } = require('child_process');

const args = ["My Token", "MTK", "1000000", "30000", "1"];

const child = spawn('node', ['scripts/afterDeployToken.js', ...args], {
    stdio: 'inherit' // This will inherit the stdio from the parent process, allowing you to see the output in the console
});

child.on('close', (code) => {
    console.log(`Child process exited with code ${code}`);
});
