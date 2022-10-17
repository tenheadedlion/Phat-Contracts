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
