#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;
use ink_prelude::vec::Vec;
use scale::{Decode, Encode};
use ink_env::AccountId;

#[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum SignedTransaction {
    /// Ethereum signed transaction
    EthSignedTX,
    /// Substrate-based chain signed transaction
    SubSignedTX,
}

#[ink::trait_definition]
pub trait Signer {
    /// Sign a transaction
    #[ink(message)]
    fn sign_transaction(&self, unsigned_tx: Vec<u8>) -> SignedTransaction;
}

pub fn greet() {

}



/*
#[ink::contract]
mod stub {
    use super::*;

    #[ink(storage)]
    pub struct StubSigner;

    impl StubSigner {
        #[ink(constructor)]
        pub fn new() -> Self {
            StubSigner {}
        }
    }

    impl Signer for StubSigner {
        #[ink(message)]
        fn sign_transaction(&self, unsigned_tx: Vec<u8>) -> SignedTransaction {
            SignedTransaction::SubSignedTX
        }
    }
}

*/