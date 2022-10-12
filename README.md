# Phat Contract Collections

## Build Contracts

```shell
cd `${package}`
cargo contract build --release
```

## Fetch a contract template

```shell
cargo install contemplate
cargo contemplate phat-contract new-package
```

## Scripts

Setup gatekeeper and cluster(once and for all):


```shell
node scripts/js/src/e2e.js
```

Deploy a specific contract

```shell
node scripts/js/src/deploy.js erc20
```

Interact with the contract:

```shell
node script/js/src/run.js erc20
```
