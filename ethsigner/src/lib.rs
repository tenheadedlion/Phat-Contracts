#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;
use pink_extension as pink;

#[pink::contract(env=PinkEnvironment)]
mod ethsigner {
    use super::*;
    use index_traits::SignedTransaction;
    use index_traits::Signer as SignerTrait;
    use ink_prelude::vec::Vec;
    use ink_primitives::Key;
    use ink_prelude::string::String;
    use ink_storage::traits::{PackedLayout, SpreadAllocate, SpreadLayout};
    use pink::PinkEnvironment;

    use pink_web3::api::{Accounts, Eth, Namespace};
    use pink_web3::keys::pink::KeyPair;
    use pink_web3::transports::{resolve_ready, PinkHttp};
    use pink_web3::types::{Bytes, TransactionParameters};

    #[ink(storage)]
    #[derive(SpreadAllocate)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct EthSigner {
        key: [u8; 32],
        url: String,
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
                url: Self::init_url(),
            }
        }

        /// Initializes the URL used to fetch signing parameters
        ///
        /// note that this is a mock function, maybe later we can fetch the url
        /// from a registry or hardcode it
        fn init_url() -> String {
            "http://localhost:3333".into()
        }

        /// Initializes the interior keys
        fn init_key(caller: AccountId) -> [u8; 32] {
            let salt: &[u8; 32] = caller.as_ref();
            KeyPair::derive_keypair(salt).private_key()
        }

        /// Returns a transport-equipped Account
        fn accounts(&self) -> Accounts<PinkHttp> {
            Accounts::new(PinkHttp::new(self.url.clone()))
        }
    }

    /// Signs the unsigned_tx with an interior predefined key
    ///
    /// todo: no sure what the unsigned_tx look like yet, if it is the serilized version of TransactionParameters,
    /// then we sign it directly; otherwise we have to contruct one from `unsigned_tx`
    impl SignerTrait for EthSigner {
        #[ink(message)]
        fn sign_transaction(&self, unsigned_tx: Vec<u8>) -> SignedTransaction {
            let keypair = self.key.into();
            let tx = TransactionParameters{ data: Bytes(unsigned_tx), ..Default::default() };
            let signed = resolve_ready(self.accounts().sign_transaction(tx, &keypair)).unwrap();
            SignedTransaction::EthSignedTX(signed.raw_transaction.0)
        }
    }
}
