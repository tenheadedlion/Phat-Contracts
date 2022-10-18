import { ethers, logger } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/abstract-provider";
import { getAddress, keccak256, resolveProperties } from "ethers/lib/utils";
import { serialize, UnsignedTransaction } from "@ethersproject/transactions";

const contract = require("../artifacts/contracts/HelloWorld.sol/HelloWorld.json");
console.log(JSON.stringify(contract.abi));

const API_KEY = process.env.API_KEY || "";
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY_2 || "";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";

class PhatWallet extends ethers.Wallet {
    signTransaction(transaction: TransactionRequest): Promise<string> {
        return resolveProperties(transaction).then((tx) => {
            if (tx.from != null) {
                if (getAddress(tx.from) !== this.address) {
                    logger.throwArgumentError("transaction from address mismatch", "transaction.from", transaction.from);
                }
                delete tx.from;
            }
            console.log(tx);
            // Change the signing function here:
            //  before: 
            //      
            const signature = this._signingKey().signDigest(keccak256(serialize(<UnsignedTransaction>tx)));
            // now:
            //      call a phat contract singer to produce the signature
            //
            // first, we must serialized the transaction before passing it to another system
            const serialiedUnsignedTxn = serialize(<UnsignedTransaction>tx);
            console.log(serialiedUnsignedTxn);
            //

            let signedTxn = serialize(<UnsignedTransaction>tx, signature);
            console.log(signedTxn);
            return signedTxn;
        });
    }

}

// Provider
const alchemyProvider = new ethers.providers.AlchemyProvider("goerli", API_KEY);

// Signer
const signer = new PhatWallet(PRIVATE_KEY, alchemyProvider);

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
}

main();