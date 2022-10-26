#![cfg_attr(not(feature = "std"), no_std)]

extern crate alloc;

use ink_lang as ink;
use pink_extension as pink;

#[ink::contract(env = pink_extension::PinkEnvironment)]
mod sub_transactor {
    use super::pink;
    use alloc::{str::FromStr, string::String, string::ToString, vec::Vec};
    use hex_literal::hex;
    use ink_storage::traits::{PackedLayout, SpreadLayout};
    use paralib::ToArray;
    use pink::{chain_extension::signing::sign, http_post, PinkEnvironment};
    use primitive_types::H256;
    use scale::{Decode, Encode};
    use serde_json::{json, Value};

    #[derive(Debug, PartialEq, Eq, Encode, Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        InvalidBody,
        InvalidUrl,
        InvalidSignature,
        RequestFailed,
        NoPermissions,
        ApiKeyNotSet,
        ChainNotConfigured,
        InvalidAccount,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    #[ink(storage)]
    pub struct SubTransactor {
        rpc_node: String,
    }

    impl SubTransactor {
        #[ink(constructor)]
        pub fn default() -> Self {
            Self {
                rpc_node: "http://localhost:9933".into(),
            }
        }
        /*
                #[ink(message)]
                pub fn send_transaction(&self, chain: String, tx_hash: Vec<u8>) -> Result<String> {
                    let tx_hex = hex::encode(&tx_hash);

                    let data = format!(
                        r#"{{"id":1,"jsonrpc":"2.0","method":"author_submitExtrinsic","params":["{}"]}}"#,
                        tx_hex
                    )
                    .into_bytes();
                    let resp_body = call_rpc(&self.rpc_node, data)?;
                    let body = String::from_utf8(resp_body).unwrap();

                    Ok(body)
                }
                /// Sends message to the target EVM contract
                #[ink(message)]
                pub fn test(&self) {
                    let pallet_index: u8 = 0;
                    let call_index: u8 = 1;
                    let signer = sp_keyring::AccountKeyring::Alice;
                    let account = signer.to_account_id();
                    let signer_nonce = get_nonce(&account);

                    let call = (pallet_index, call_index, hex!("284772656574696e677321"));
                    let extra = (
                        Era::Immortal,
                        Compact(signer_nonce),
                        Compact(500000000000000u128),
                    );

                    let runtime_version = get_runtime_version().await;
                    let genesis_hash = get_genesis_hash().await;

                    let additional = (
                        runtime_version.spec_version,
                        runtime_version.transaction_version,
                        genesis_hash,
                        genesis_hash,
                    );
                    let signature = {
                        // Combine this data together and SCALE encode it:
                        let full_unsigned_payload = (&call, &extra, &additional);
                        let full_unsigned_payload_scale_bytes = full_unsigned_payload.encode();

                        // If payload is longer than 256 bytes, we hash it and sign the hash instead:
                        if full_unsigned_payload_scale_bytes.len() > 256 {
                            AccountKeyring::Alice.sign(&blake2_256(&full_unsigned_payload_scale_bytes)[..])
                        } else {
                            AccountKeyring::Alice.sign(&full_unsigned_payload_scale_bytes)
                        }
                    };
                    let signature_to_encode = Some((
                        //signer.to_h256_public(),
                        MultiAddress::Id::<_, u32>(account),
                        // The actual signature, computed above:
                        MultiSignature::Sr25519(signature),
                        // Extra information to be included in the transaction:
                        extra,
                    ));
                    let payload_scale_encoded = encode_extrinsic(signature_to_encode, call);
                    let payload_hex = format!("0x{}", hex::encode(&payload_scale_encoded));

                    // Submit it!
                    println!("Submitting this payload: {}", &payload_hex);
                    let res = rpc(&self.rpc_node, "author_submitExtrinsic", &payload_hex)?;
                    // The result from this call is the hex value for the extrinsic hash.
                    println!("{:?}", res);
                }
        */
        #[ink(message)]
        pub fn get_genesis_hash(&self)
        // -> Result<H256>
        {
            let genesis_hash_json = rpc(&self.rpc_node, "chain_getBlockHash", [0]).unwrap();
            dbg!(&genesis_hash_json["result"]);
            //let genesis_hash_hex = genesis_hash_json.as_str()?;
            //H256::from_str(genesis_hash_hex)
        }
    }

    fn rpc<Params: serde::Serialize>(
        rpc_node: &str,
        method: &str,
        params: Params,
    ) -> Result<Value> {
        //let content_length = format!("{}", params.len());

        //let a = serde::t

        //let data = format!(
        //    r#"{{"id":1,"jsonrpc":"2.0","method":"{}","params":["{}"]}}"#,
        //    method, params
        //)
        //.into_bytes();
        let data = json! {{
            "id": 1,
            "jsonrpc": "2.0",
            "method": method,
            "params": params
        }};
        let data = data.to_string();
        dbg!(&data);
        let content_length = data.len();

        let headers: Vec<(String, String)> = vec![
            ("Content-Type".into(), "application/json".into()),
            ("Content-Length".into(), content_length.to_string()),
        ];
        //
        let response = http_post!(rpc_node, data.as_bytes(), headers);
        //
        if response.status_code != 200 {
            return Err(Error::RequestFailed);
        }

        let body: Value = serde_json::from_slice(&response.body).map_err(|_| Error::InvalidBody)?;
        Ok(body)
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use dotenv::dotenv;
        use hex_literal::hex;
        use ink_lang as ink;

        #[ink::test]
        fn it_works() {
            dotenv().ok();
            use std::env;

            pink_extension_runtime::mock_ext::mock_all_ext();

            pink_extension::chain_extension::mock::mock_derive_sr25519_key(|_| {
                hex!["4c5d4f158b3d691328a1237d550748e019fe499ebf3df7467db6fa02a0818821"].to_vec()
            });

            // Register contracts
            let hash1 = ink_env::Hash::try_from([10u8; 32]).unwrap();
            ink_env::test::register_contract::<SubTransactor>(hash1.as_ref());

            // Deploy Transactor(phat contract)
            let mut transactor = SubTransactorRef::default()
                .code_hash(hash1)
                .endowment(0)
                .salt_bytes([0u8; 0])
                .instantiate()
                .expect("failed to deploy SubTransactor");

            transactor.get_genesis_hash();
        }
    }
}
