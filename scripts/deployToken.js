async function main(){

const [deployer] = await ethers.getSigners();

const TestFactory = await ethers.getContractFactory('TestFactory',deployer);

const testFactory = await TestFactory.deploy();

console.log("Token deployed to: ", testFactory.address);


}

main();