#![cfg_attr(not(feature = "std"), no_std)]

use ink_env::AccountId;
use ink_lang as ink;
use ink_prelude::vec::Vec;
use scale::{Decode, Encode};

#[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum SignedTransaction {
    /// Ethereum signed transaction
    EthSignedTX(Vec<u8>),
    /// Substrate-based chain signed transaction
    SubSignedTX(Vec<u8>),
}

#[ink::trait_definition]
pub trait Signer {
    /// Sign a transaction
    #[ink(message)]
    fn sign_transaction(&self, unsigned_tx: Vec<u8>) -> SignedTransaction;
}
