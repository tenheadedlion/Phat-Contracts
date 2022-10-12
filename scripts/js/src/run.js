const { ContractPromise } = require("@polkadot/api-contract");
const fs = require("fs");
const { ApiPromise, WsProvider, Keyring } = require("@polkadot/api");
const Phala = require("@phala/sdk");
const { TxQueue, checkUntil, hex } = require("./utils");
const config = require("./config.json");
const keyringJson = require("./keyring.json");

async function main() {

  const args = process.argv.slice(2);
  const package = args[0];

  console.log("Current directory:", process.cwd());
  console.log("package: " + package);

  const raw = fs.readFileSync(`./target/contract_jsons/${package}.contract`);
  const contract = JSON.parse(raw);

  const wsProvider = new WsProvider(config.provider);
  const api = await ApiPromise.create({
    provider: wsProvider,
  });

  const newApi = await api.clone().isReady;
  const foo = new ContractPromise(
    await Phala.create({
      api: newApi,
      baseURL: config.pruntimeURL,
      contractId: contract.address,
    }),
    contract.metadata,
    contract.address
  );

  console.log(foo.query);

  //console.log(foo.query.totalSupply);
  const supply = await foo.query.totalSupply({});

  // maximum gas to be consumed for the call. if limit is too small the call will fail.
  const gasLimit = 3000n * 1000000n;
  // a limit to how much Balance to be used to pay for the storage created by the contract call
  // if null is passed, unlimited balance can be used
  const storageDepositLimit = null;

  const { gasRequired, storageDeposit, result, output } =
    await foo.query.totalSupply({
      gasLimit,
      storageDepositLimit,
    });

  console.log(gasRequired);
  console.log(storageDeposit);
  console.log(result);
  console.log(output);
}

main()
  .then(process.exit)
  .catch((err) => console.error("Crashed", err))
  .finally(() => process.exit(-1));
