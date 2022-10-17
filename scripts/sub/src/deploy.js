const { ApiPromise, WsProvider, Keyring } = require("@polkadot/api");
const { ContractPromise } = require("@polkadot/api-contract");
const Phala = require("@phala/sdk");
const fs = require("fs");

const { TxQueue, checkUntil, hex } = require("./utils");
const { loadContractFile, deployContract } = require("./common");
const { fstat } = require("fs");
const config = require("./config.json");
const keyringJson = require("./keyring.json");

async function main() {
  const args = process.argv.slice(2);
  const package = args[0];

  console.log("Current directory:", process.cwd());
  console.log("package: " + package);

  const keyring = new Keyring({ type: "sr25519" });
  const alice = keyring.addFromJson(keyringJson);
  alice.unlock();

  const provider = config.provider;
  // connect to the chain
  const wsProvider = new WsProvider(provider);
  const api = await ApiPromise.create({
    provider: wsProvider,
    types: {
      ...Phala.types,
    },
  });
  const txqueue = new TxQueue(api);

  const contract = loadContractFile(
    `./target/ink/${package}/${package}.contract`,
    "new"
  );

  await deployContract(api, txqueue, alice, contract, config.clusterId);

  const jsonDump = {
    metadata: contract.metadata,
    address: contract.address,
  };
  fs.writeFileSync(
    `./target/contract_jsons/${package}.contract`,
    JSON.stringify(jsonDump)
  );
}

main()
  .then(process.exit)
  .catch((err) => console.error("Crashed", err))
  .finally(() => process.exit(-1));
