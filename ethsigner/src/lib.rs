#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;
use pink_extension as pink;

#[pink::contract(env=PinkEnvironment)]
mod ethsigner {
    use super::*;
    use index_traits::SignedTransaction;
    use index_traits::Signer as SignerTrait;
    use ink_prelude::string::String;
    use ink_prelude::vec::Vec;
    use ink_primitives::Key;
    use ink_storage::traits::{PackedLayout, SpreadAllocate, SpreadLayout};
    use paralib::ToArray;
    use pink::chain_extension::signing;
    use pink::PinkEnvironment;
    use pink_web3::ethabi::FunctionOutputDecoder;
    use pink_web3::types::U256;
    use rlp::Rlp;
    use rlp::RlpStream;
    use signing::SigType;

    use pink_web3::api::{Accounts, Eth, Namespace};
    use pink_web3::keys::pink::KeyPair;
    use pink_web3::transports::{resolve_ready, PinkHttp};
    use pink_web3::types::{Bytes, TransactionParameters};

    #[ink(storage)]
    #[derive(SpreadAllocate)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct EthSigner {
        key: [u8; 32],
        rpc: String,
    }

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        FailToSign,
    }

    impl EthSigner {
        #[ink(constructor)]
        pub fn new() -> Self {
            let admin = Self::env().caller();
            EthSigner {
                key: Self::init_key(admin),
                rpc: String::default(),
            }
        }

        /// Initializes the contract
        fn init(&mut self, rpc: String) {
            self.rpc = rpc;
        }

        /// Initializes the interior keys
        fn init_key(caller: AccountId) -> [u8; 32] {
            let salt: &[u8; 32] = caller.as_ref();
            KeyPair::derive_keypair(salt).private_key()
        }

        /// Returns a transport-equipped Account
        fn accounts(&self) -> Accounts<PinkHttp> {
            Accounts::new(PinkHttp::new(self.rpc.clone()))
        }

        /// Imports the private key from ASCII hex string, for tests only
        ///
        /// This function will be removed in the future
        #[ink(message)]
        pub fn import_private_key(&mut self, pk: String) {
            self.key = hex::decode(pk).unwrap().to_array();
        }

        /// Returns the public key, for tests only
        ///
        /// This function will be removed in the future
        #[ink(message)]
        pub fn public_key(&self) -> Vec<u8> {
            signing::get_public_key(&self.key, SigType::Ecdsa)
        }
    }

    fn parse_transaction(payload: Vec<u8>) //-> TransactionParameters
    {
    }

    /// Signs the rlp-encoded unsigned_tx
    impl SignerTrait for EthSigner {
        #[ink(message)]
        fn sign_transaction(&self, unsigned_tx: Vec<u8>) -> SignedTransaction {
            let keypair: KeyPair = self.key.into();
            const LEGACY_TX_ID: u8 = 0;
            const ACCESSLISTS_TX_ID: u8 = 1;
            const EIP1559_TX_ID: u8 = 2;

            let txn_type = unsigned_tx[0];
            let adjust_v_value = matches!(txn_type, LEGACY_TX_ID);

            let txn = &unsigned_tx[1..];
            let rlp = Rlp::new(txn);
            let chain_id = rlp.at(0).unwrap().as_val::<u64>().unwrap();

            let hash = pink_web3::signing::keccak256(&unsigned_tx);

            let signature = if adjust_v_value {
                pink_web3::signing::Key::sign(&keypair, &hash, Some(chain_id))
                    .expect("hash is non-zero 32-bytes; qed")
            } else {
                pink_web3::signing::Key::sign_message(&keypair, &hash)
                    .expect("hash is non-zero 32-bytes; qed")
            };

            let mut stream = RlpStream::new();

            stream.begin_list(rlp.item_count().unwrap() + 3);
            let raw = rlp.data().unwrap();
            stream.append_raw(raw, rlp.item_count().unwrap());
            stream.append(&signature.v);
            stream.append(&U256::from_big_endian(signature.r.as_bytes()));
            stream.append(&U256::from_big_endian(signature.s.as_bytes()));

            let output = if txn_type == 0 {
                // legacy and eip155 transaction
                [rlp.as_raw(), &stream.out()].concat()
            } else if txn_type == ACCESSLISTS_TX_ID || txn_type == EIP1559_TX_ID {
                [&[txn_type], stream.as_raw()].concat()
            } else {
                panic!("Unsupported transaction type")
            };
            SignedTransaction::EthSignedTX(output)

        }
    }

    #[cfg(test)]
    mod test {
        use super::*;
        use ink_lang as ink;
        #[ink::test]
        fn test_keys() {
            pink_extension_runtime::mock_ext::mock_all_ext();

            let mut signer = EthSigner::new();
            signer.import_private_key(
                "c7f810b1ad890950b498c3cda2b60cb5d9c65aa7d2822e6307cf75450dcbe4a4".to_string(),
            );

            let pubkey = signer
                .public_key()
                .try_into()
                .expect("Public key should be of length 33");
            let mut address = [0u8; 20];
            _ = ink_env::ecdsa_to_eth_address(&pubkey, &mut address);
            assert_eq!(
                hex::encode(address),
                "25d0aFBC1Ad376136420aF0B5Aa74123359b9b77".to_lowercase()
            );
            let unsigned_tx = hex::decode("02f88c05808459682f00845996600682734594990dae794b11fa6469491251004d4f36bc497af180b8643d7403a3000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000177468697320697320746865206e6577206d657373616765000000000000000000c0").unwrap();
            if let SignedTransaction::EthSignedTX(signed) = signer.sign_transaction(unsigned_tx) {
                assert_eq!(hex::encode(signed), "02f8cf05808459682f00845996600682734594990dae794b11fa6469491251004d4f36bc497af180b8643d7403a3000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000177468697320697320746865206e6577206d657373616765000000000000000000c080a02f86f97475fc230cb981ccc31592d38eef7476379ae03bd11d9f55c3b44f4f53a00eb415de6bac8038b588538d30194d26c7d17f18d36e713bccc6feb12ffc512d");
            }
        }
    }
}
