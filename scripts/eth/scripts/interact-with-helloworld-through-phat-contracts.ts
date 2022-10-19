import { ethers, logger, Contract, Signer } from 'ethers';
import { Provider, TransactionRequest } from "@ethersproject/abstract-provider";
import { getAddress, keccak256, resolveProperties } from "ethers/lib/utils";
import { serialize, UnsignedTransaction } from "@ethersproject/transactions";
import { ContractPromise } from "@polkadot/api-contract";
import fs from "fs";
import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { khalaDev } from '@phala/typedefs'
import * as Phala from "@phala/sdk";
import { hexToU8a, hexAddPrefix, hexStripPrefix, u8aToHex } from '@polkadot/util'
import assert from 'assert'
import { createType } from '@polkadot/types'

import keyringJson from "../../sub/src/keyring.json";
import contract from "../artifacts/contracts/HelloWorld.sol/HelloWorld.json";
import { GetContractTypeFromFactory } from '../typechain-types/common';
console.log(JSON.stringify(contract.abi));

const API_KEY = process.env.API_KEY || "";
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY_2 || "";
const WALLET_ADDRESS = process.env.WALLET_ADDRESS_2 || "";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";
const PHALA_PROVIDER = process.env.PHALA_PROVIDER || "ws://localhost:19944"
const PHALA_PRUNTIME = process.env.PHALA_PRUNTIME || "http://localhost:18000"

// note that the hexString must be literally prefixed with `0x`
// eg: "0x02f88c05808459682f00845996600682734594990dae794b11fa6469491251004d4f36bc497af180b8643d7403a3000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000177468697320697320746865206e6577206d657373616765000000000000000000c0";
async function phatSign(hexString: string): Promise<string> {
    const pkg = "ethsigner";
    const wsProvider = new WsProvider(PHALA_PROVIDER);
    const api = await ApiPromise.create({
        provider: wsProvider,
        types: {
            ...khalaDev,
            ...Phala.types,
        },
    });

    const contractData = JSON.parse(
        fs.readFileSync(`../../target/contract_jsons/${pkg}.contract`)
    );

    const contract = new ContractPromise(
        await Phala.create({
            api: api,
            baseURL: PHALA_PRUNTIME,
            contractId: contractData.address,
        }),
        contractData.metadata,
        contractData.address
    );

    const keyring = new Keyring({ type: "sr25519" });
    const alice = keyring.addFromJson(keyringJson);
    alice.unlock();
    const certificateData = await Phala.signCertificate({
        api,
        pair: alice,
    });

    console.log("alice address:", alice.address);

    const randRes = await contract.query["address"](certificateData, {});
    let randAddr = u8aToHex(randRes.output);
    console.log(randAddr);
    await contract.tx["importPrivateKey"](certificateData, PRIVATE_KEY)
        .signAndSend(alice);

    console.log("wait for transaction to be finalized");
    await new Promise(f => setTimeout(f, 12000));

    const res = await contract.query["address"](certificateData, {});

    let addr = u8aToHex(res.output);
    console.log(addr);
    assert.equal(addr, WALLET_ADDRESS.toLocaleLowerCase());

    const signingQuery = await contract.query["signerTrait::signTransaction"](certificateData, {}, hexString);
    let output = signingQuery.output;
    await api.disconnect();

    console.log(output?.toRawType());

    let signedTxn = u8aToHex((output?.asEthSignedTX));
    console.log(signedTxn);
    return signedTxn;
}

class PhatWallet extends ethers.Wallet {
    signTransaction(transaction: TransactionRequest): Promise<string> {
        return resolveProperties(transaction).then(async (tx) => {
            if (tx.from != null) {
                if (getAddress(tx.from) !== this.address) {
                    logger.throwArgumentError("transaction from address mismatch", "transaction.from", transaction.from);
                }
                delete tx.from;
            }
            console.log(tx);

            const serialiedUnsignedTxn = serialize(<UnsignedTransaction>tx);
            let signedTxn = await phatSign(serialiedUnsignedTxn);

            const signatureByEthersWallet = this._signingKey().signDigest(keccak256(serialize(<UnsignedTransaction>tx)));
            let signedTxnByEthersWallet = serialize(<UnsignedTransaction>tx, signatureByEthersWallet);

            console.log(signedTxn);
            console.log(signedTxnByEthersWallet);
            assert.equal(signedTxn, signedTxnByEthersWallet);

            return signedTxn;
        });
    }

}

// Provider
const alchemyProvider = new ethers.providers.AlchemyProvider("goerli", API_KEY);

// Signer
const signer = new PhatWallet(PRIVATE_KEY, alchemyProvider);
//const signer = new ethers.Wallet(PRIVATE_KEY, alchemyProvider);

// contract instance
const helloWorldContract = new ethers.Contract(CONTRACT_ADDRESS, contract.abi, signer);

async function main() {

    const message = await helloWorldContract.message();
    console.log("The message is: " + message);

    console.log("Updating the message...");
    const tx = await helloWorldContract.update("this is the new message");
    await tx.wait();

    const newMessage = await helloWorldContract.message();
    console.log("The new message is: " + newMessage);

    // let serialiedUnsignedTxn = "0x02f88c05808459682f00845996600682734594990dae794b11fa6469491251004d4f36bc497af180b8643d7403a3000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000177468697320697320746865206e6577206d657373616765000000000000000000c0";
    // let signedTxn = await phatSign(serialiedUnsignedTxn);
    // console.log(signedTxn);

}

main().then(process.exit);
