#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;
use pink_extension as pink;


use index_traits::Signer as SignerTrait;
use index_traits::SignedTransaction;

#[pink::contract(env=PinkEnvironment)]
mod stub {
    use super::*;
    use pink_extension::PinkEnvironment;
    use ink_prelude::vec::Vec;

    #[ink(storage)]
    pub struct StubSigner;

    impl StubSigner {
        #[ink(constructor)]
        pub fn new() -> Self {
            //let a = index_traits::add(2, 3);
            StubSigner {}
        }
     
        #[ink(message)]
        pub fn get(&self) -> i32 {
            2
        }
    }
    

    impl SignerTrait for StubSigner {
        #[ink(message)]
        fn sign_transaction(&self, unsigned_tx: Vec<u8>) -> SignedTransaction {
            SignedTransaction::SubSignedTX
        }
    }
}
