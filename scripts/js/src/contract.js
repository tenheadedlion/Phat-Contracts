const { ContractPromise } = require("@polkadot/api-contract");
const fs = require("fs");
const { ApiPromise, WsProvider, Keyring } = require("@polkadot/api");
const Phala = require("@phala/sdk");
const { TxQueue, checkUntil, hex } = require("./utils");

async function main() {
  const raw = fs.readFileSync("./res/.contract");
  const contract = JSON.parse(raw);
  console.log(contract.pruntimeURL);

  const wsProvider = new WsProvider(contract.provider);
  const api = await ApiPromise.create({
    provider: wsProvider,
  });

  const newApi = await api.clone().isReady;
  const foo = new ContractPromise(
    await Phala.create({
      api: newApi,
      baseURL: contract.pruntimeURL,
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
