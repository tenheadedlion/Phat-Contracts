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

## The PHAT Token on Goerli Testnet

Take a walk through this: https://hardhat.org/tutorial

```shell
$ npx hardhat run scripts/deploy-hardhat.ts --network goerli
Token address: 0x455f633a104eA0ED155576aDb3b484b0BC3e6c3F
```

Max Total Supply: 100 PHAT

## Subxt

Subxt is a library used to interact with substrate chains, and can be regarded as the Rust version of polkadot.js


To use the library, a copy of metadata for the target runtime is required, the metadata can be fetched via the `subxt-cli` tool, for example, to fetch the metadata from a Khala node, run this from the root of your project, note that the port number must be explicitly placed behind the URL domain

```
subxt metadata --url wss://khala.api.onfinality.io:443/public-ws -f bytes > metadata.scale
```

Put your secret key in the `.env` file in the root of the project

```
SECRET_KEY=SDFSFAFSDF...
```

Here is a minimal example:

```rust
use dotenv::dotenv;
use sp_core::sr25519::Pair as Sr25519Pair;
use sp_core::Pair;
use std::env;
use subxt::tx::PairSigner;
use subxt::{OnlineClient, PolkadotConfig};

#[subxt::subxt(runtime_metadata_path = "metadata.scale")]
pub mod polkadot {}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    let secret_key = env::vars().find(|x| x.0 == "SECRET_KEY").unwrap().1;
    let secret_key = hex::decode(secret_key).unwrap();
    let signer = PairSigner::new(Sr25519Pair::from_seed_slice(&secret_key).unwrap());

    tracing_subscriber::fmt::init();
    let api =
        OnlineClient::<PolkadotConfig>::from_url("wss://khala.api.onfinality.io:443/public-ws")
            .await?;

    let remark_tx = polkadot::tx()
        .system()
        .remark("Greetings!".as_bytes().to_vec());
    let tx_id = api
        .tx()
        .sign_and_submit_default(&remark_tx, &signer)
        .await?;
    dbg!(tx_id);
    // https://khala.subscan.io/extrinsic/0xe0bdf15b35cd649c59ee27585d3efa33d29dba49f754844589d9e47ee247ef96
    Ok(())
}
```
