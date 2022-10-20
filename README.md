# Phat Contract Collections

This repository represents a collection of [Phat Contracts](https://wiki.phala.network/en-us/general/phala-network/intro/) written for fun and profit, and provides a set of companion scripts to simplify the development process.

## Build Contracts

```shell
cd ${package}
cargo contract build --release
```

## Fetch a contract template

Install the cargo subcommand tool:

```shell
cargo install contemplate
```

Run this command from the root directory of your project:

```shell
cargo contemplate phat-contract ${new_package}
```

## Scripts

To begin with, edit the [configuration file](./scripts/sub/src/config.json) to suit your needs

```shell
{
    "provider":"ws://localhost:19944",
    "pruntimeURL":"http://localhost:18000"
}
```

Setup the gatekeeper and the default cluster(once and for all):

```shell
node scripts/sub/srce2e.js
```

Deploy a specific contract

```shell
node scripts/sub/src/deploy.js erc20
```

Interact with the contract:

```shell
node script/sub/src/run.js erc20
```

## Interact with Ethereum Contracts

Follow [this instruction](https://docs.alchemy.com/docs/hello-world-smart-contract) to build your contracts and interact with them like this:

```shell
cd eth
npx hardhat run scripts/interact-with-helloworld.ts
```

Configure your own `.env`:

```config
GOERLI_RPC_URL="https://eth-goerli.g.alchemy.com/v2/<API KEY>"
WALLET_ADDRESS=""
WALLET_PRIVATE_KEY=""
API_KEY=""
CONTRACT_ADDRESS="0x990dae794B11Fa6469491251004D4f36bc497AF1"
```

## The PHAT Token

Take a walk through this: https://hardhat.org/tutorial

```shell
$ npx hardhat run scripts/deploy-hardhat.ts --network goerli
Token address: 0x455f633a104eA0ED155576aDb3b484b0BC3e6c3F
```

Max Total Supply: 100 PHAT



