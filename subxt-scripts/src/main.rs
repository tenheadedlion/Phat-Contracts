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
        OnlineClient::<PolkadotConfig>::
        //from_url("wss://khala.api.onfinality.io:443/public-ws")
        from_url("ws://localhost:19944")
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
    // https://polkadot.js.org/apps/?rpc=ws%3A%2F%2F127.0.0.1%3A19944#/explorer/query/0xf8574751d12457e16ba812fbe0fc4bd24b7665ba4775bd28a1c5c19751aafacb
    Ok(())
}
