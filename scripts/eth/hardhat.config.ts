import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";


dotenv.config();

const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL || ""
const GOERLI_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || ""

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {
    goerli: {
      url: GOERLI_RPC_URL,
      accounts: [GOERLI_PRIVATE_KEY]
    }
  },

};

export default config;

task("getBalance")
  // specify `--address` argument for the task, task arguments will be available as the 1st parameter `taskArgs` below
  .addParam("address")
  // specify handler function for the task, `hre` is the task context that contains `ethers` package
  .setAction(async (taskArgs, hre) => {
    // create RPC provider for Goerli network
    const provider = hre.ethers.getDefaultProvider("goerli");
    console.log(
      "$ETH",
      // format it from Gwei to ETH
      hre.ethers.utils.formatEther(
        // fetch wallet balance using its address
        await provider.getBalance(taskArgs.address)
      )
    );
  });
