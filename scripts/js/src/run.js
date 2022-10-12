const { ContractPromise } = require("@polkadot/api-contract");
const fs = require("fs");
const { ApiPromise, WsProvider, Keyring } = require("@polkadot/api");
const Phala = require("@phala/sdk");
const { TxQueue, checkUntil, hex } = require("./utils");
const config = require("./config.json");
const keyringJson = require("./keyring.json");

async function main() {
  const args = process.argv.slice(2);
  const pkg = args[0];

  console.log("Current directory:", process.cwd());
  console.log("package: " + pkg);

  const raw = fs.readFileSync(`./target/contract_jsons/${pkg}.contract`);
  const contractData = JSON.parse(raw);

  const wsProvider = new WsProvider(config.provider);
  const api = await ApiPromise.create({
    provider: wsProvider,
    types: {
      ...Phala.khalaDev,
      ...Phala.types
    },
  });

  const newApi = await api.clone().isReady;
  const contract = new ContractPromise(
    await Phala.create({
      api: newApi,
      baseURL: config.pruntimeURL,
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

  const {output} = await contract.query.get(certificateData, {})
  console.log(output);
  await api.disconnect()
  //  return res.status(200).json(output?.toJSON())



}

main()
  .then(process.exit)
  .catch((err) => console.error("Crashed", err))
  .finally(() => process.exit(-1));
