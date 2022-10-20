#![cfg_attr(not(feature = "std"), no_std)]

extern crate alloc;

use ink_lang as ink;

#[ink::contract(env = pink_extension::PinkEnvironment)]
mod evm_transator {
    use alloc::{string::String, string::ToString, vec::Vec};
    use ink_storage::traits::{PackedLayout, SpreadLayout};
    use paralib::ToArray;
    use pink_web3::signing::Key;
    use scale::{Decode, Encode};

    #[ink(storage)]
    pub struct EvmTransactor {
        owner: AccountId,
        key: [u8; 32],
        config: Option<Config>,
    }

    #[derive(Encode, Decode, Debug, PackedLayout, SpreadLayout)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink_storage::traits::StorageLayout)
    )]
    struct Config {
        rpc: String,
        evm_contract: [u8; 20],
    }

    #[derive(Encode, Decode, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        BadOrigin,
        NotConfigurated,
        KeyRetired,
        KeyNotRetiredYet,
        UpstreamFailed,
        BadAbi,
        FailedToGetStorage,
        FailedToDecodeStorage,
        FailedToEstimateGas,
    }

    type Result<T> = core::result::Result<T, Error>;

    impl EvmTransactor {
        #[ink(constructor)]
        pub fn default() -> Self {
            Self {
                owner: Self::env().caller(),
                config: None,
                key: Self::key_pair().private_key(),
            }
        }

        /// Configures the transactor
        #[ink(message)]
        pub fn config(&mut self, rpc: String, evm_contract: H160) -> Result<()> {
            self.ensure_owner()?;
            self.config = Some(Config {
                rpc,
                evm_contract: evm_contract.into(),
            });
            Ok(())
        }

        /// Adds an account from a private key, for tests only
        #[ink(message)]
        pub fn add_account(&mut self, private_key: Vec<u8>) -> H160 {
            self.key = private_key.to_array();
            self.wallet()
        }

        /// Returns the wallet address the transactor used to submit transactions
        #[ink(message)]
        pub fn wallet(&self) -> H160 {
            let keypair: KeyPair = self.key.into();
            keypair.address()
        }

        /// Returns BadOrigin error if the caller is not the owner
        fn ensure_owner(&self) -> Result<()> {
            if self.env().caller() == self.owner {
                Ok(())
            } else {
                Err(Error::BadOrigin)
            }
        }

        /// Derives the key pair on the fly
        fn key_pair() -> pink_web3::keys::pink::KeyPair {
            pink_web3::keys::pink::KeyPair::derive_keypair(b"rollup-transactor")
        }

        /// Polls message from the target EVM contract
        #[ink(message)]
        pub fn message(&self) -> Result<String> {
            let Config { rpc, evm_contract } =
                self.config.as_ref().ok_or(Error::NotConfigurated)?;

            let contract = EvmContractClient::connect(rpc, evm_contract.clone().into())?;

            let pair: KeyPair = self.key.into();
            contract.message()
        }

        /// Sends message to the target EVM contract
        #[ink(message)]
        pub fn update(&self, message: String) -> Result<()> {
            let Config { rpc, evm_contract } =
                self.config.as_ref().ok_or(Error::NotConfigurated)?;

            let contract = EvmContractClient::connect(rpc, evm_contract.clone().into())?;

            let pair: KeyPair = self.key.into();
            _ = contract.update(pair, message)?;

            Ok(())
        }
    }

    use pink_web3::contract::{Contract, Options};
    use pink_web3::transports::{resolve_ready, PinkHttp};
    use pink_web3::types::{Res, H160};
    use pink_web3::{
        api::{Eth, Namespace},
        keys::pink::KeyPair,
    };

    /// The client to submit transaction to the Evm evm_contract contract
    struct EvmContractClient {
        contract: Contract<PinkHttp>,
    }

    impl EvmContractClient {
        fn connect(rpc: &String, address: H160) -> Result<EvmContractClient> {
            let eth = Eth::new(PinkHttp::new(rpc));
            let contract =
                Contract::from_json(eth, address, include_bytes!("../res/evm_contract.abi.json"))
                    .or(Err(Error::BadAbi))?;

            Ok(EvmContractClient { contract })
        }

        /// Calls the EVM contract function `message`
        fn message(&self) -> Result<String> {
            let a: String =
                resolve_ready(
                    self.contract
                        .query("message", (), None, Options::default(), None),
                )
                .expect("FIXME: query failed");
            Ok(a)
        }

        // Calls the EVM contract function `update`,
        // returns the transaction id if it succeed
        fn update(&self, pair: KeyPair, message: String) -> Result<primitive_types::H256> {
            // Estiamte gas before submission
            let gas = resolve_ready(self.contract.estimate_gas(
                "update",
                message.clone(),
                pair.address(),
                Options::default(),
            ))
            .expect("FIXME: failed to estiamte gas");

            dbg!(gas);

            // Actually submit the tx (no guarantee for success)
            let tx_id = resolve_ready(self.contract.signed_call(
                "update",
                message,
                Options::with(|opt| opt.gas = Some(gas)),
                pair,
            ))
            .expect("FIXME: submit failed");
            Ok(tx_id)
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use dotenv::dotenv;
        use hex_literal::hex;
        use ink::ToAccountId;
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
            ink_env::test::register_contract::<EvmTransactor>(hash1.as_ref());

            // Deploy Transactor
            let mut transactor = EvmTransactorRef::default()
                .code_hash(hash1)
                .endowment(0)
                .salt_bytes([0u8; 0])
                .instantiate()
                .expect("failed to deploy EvmTransactor");

            let rpc =
                "https://eth-goerli.g.alchemy.com/v2/ZW4OBtfvnKAYOEPWHOLS8s5aE9c3ddeq".to_string();
            let evm_contract: H160 = hex!("990dae794B11Fa6469491251004D4f36bc497AF1").into();
            dbg!(&evm_contract);
            dbg!(&rpc);
            transactor.config(rpc, evm_contract).unwrap();
            let secret_key = env::vars().find(|x| x.0 == "SECRET_KEY").unwrap().1;
            let secret_bytes = hex::decode(secret_key).unwrap();

            transactor.add_account(secret_bytes);

            // Call transactor
            transactor.update("hello".to_string()).unwrap();
            dbg!(transactor.message().unwrap());
        }
    }
}
