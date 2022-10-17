import { ethers } from "hardhat";

async function main() {
  const HelloWorld = await ethers.getContractFactory("HelloWorld");
  
  // Start deployment, returning a promise that resolves to a contract object
  const hello_world = await HelloWorld.deploy("Hello World!");
  console.log("Contract deployed to address:", hello_world.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
