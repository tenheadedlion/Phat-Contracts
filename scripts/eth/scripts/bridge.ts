import { ethers, logger, Contract, Signer } from 'ethers';
import { Provider, TransactionRequest } from "@ethersproject/abstract-provider";
import { getAddress, keccak256, resolveProperties } from "ethers/lib/utils";
import { serialize, UnsignedTransaction } from "@ethersproject/transactions";
import { ContractPromise } from "@polkadot/api-contract";
import fs from "fs";
import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { khalaDev } from '@phala/typedefs'
import * as Phala from "@phala/sdk";
import { hexToU8a, hexAddPrefix, hexStripPrefix, u8aToHex} from '@polkadot/util'
import assert from 'assert'
import { createType } from '@polkadot/types'
import { BN } from 'bn.js'

import keyringJson from "../../sub/src/keyring.json";
import bridgeContract from "./abi/goerli-bridge.json";
import tokenContract from "./abi/goerli-token.json";
import { GetContractTypeFromFactory } from '../typechain-types/common';
//console.log(JSON.stringify(contract.abi));

const API_KEY = process.env.API_KEY || "";
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY_2 || "";
const WALLET_ADDRESS = process.env.WALLET_ADDRESS_2 || "";
const PHALA_PROVIDER = process.env.PHALA_PROVIDER || "ws://localhost:19944"
const PHALA_PRUNTIME = process.env.PHALA_PRUNTIME || "http://localhost:18000"

// Provider
const alchemyProvider = new ethers.providers.AlchemyProvider("goerli", API_KEY);

// Signer
const signer = new ethers.Wallet(PRIVATE_KEY, alchemyProvider);
//const signer = new ethers.Wallet(PRIVATE_KEY, alchemyProvider);

const BRIDGE_CONTRACT_ADDRESS = "0x056c0e37d026f9639313c281250ca932c9dbe921";
const TOKEN_CONTRACT_ADDRESS = "0xb376b0ee6d8202721838e76376e81eec0e2fe864";
const RESOURCE_ID = '0x00e6dfb61a2fb903df487c401663825643bb825d41695e63df8af6162ab145a6';
// contract instance
const bridge = new ethers.Contract(BRIDGE_CONTRACT_ADDRESS, bridgeContract.abi, signer);
const bank = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, tokenContract.abi, signer);


async function main() {

    const resourceHandler = await bridge._resourceIDToHandlerAddress(RESOURCE_ID);
    console.log("resourceHandler: " + resourceHandler);

    const balance = await bank.balanceOf(signer.address);
    console.log("address:" + signer.address);
    // 500_000000000000000000 PHA
    //    
    console.log("balance: " + balance);

    //await bank.approve(resourceHandler, 500);
    let apprTx = await bank.populateTransaction['approve'](
        ...[resourceHandler, balance]
    )!;
    apprTx.gasPrice = 15000000000
    apprTx.gasLimit = 10000000
    let hash1 = (await signer.sendTransaction(apprTx)).hash
    console.log(`Transaction sent: ${hash1}`)

    await new Promise(f => setTimeout(f, 12000));

    const allowance = await bank.allowance(signer.address, resourceHandler);
    console.log("allowance:" + allowance);

    let amount = '100000000000000000000';

  //let dest = "0x00010100b40f793c2984f7703bffd7ab0f6ba4245aa89f1ff5e26c32fe2cc77b2dc38a30";
    let dest = "0x000101008eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48"
    console.log(dest);

    let data =
        '0x' +
        ethers.utils
            .hexZeroPad(ethers.BigNumber.from(amount.toString()).toHexString(), 32)
            .slice(2) +
        ethers.utils
            .hexZeroPad(ethers.utils.hexlify((dest.length - 2) / 2), 32)
            .slice(2) +
        dest.slice(2);
    let tx = await bridge.populateTransaction['deposit'](
        ...[1, RESOURCE_ID, data]
    )!;
    // price too high: errors, 10 Gwei failed, result was quick
    // decrease to 1 Gwei: slow, and failed
     tx.gasPrice = 15000000000
     tx.gasLimit = 10000000
    //console.log(tx)
    let hash2 = (await signer.sendTransaction(tx)).hash
    console.log(`Transaction sent: ${hash2}`)

}

main().then(process.exit);
