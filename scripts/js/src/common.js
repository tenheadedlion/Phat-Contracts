const fs = require("fs");
const crypto = require("crypto");
const Phala = require("@phala/sdk");
const { checkUntil, checkUntilEq, hex } = require("./utils");

function loadContractFile(contractFile, label) {
  console.log("Loading contract file: " + contractFile);
  const metadata = JSON.parse(fs.readFileSync(contractFile));
  const constructor = metadata.V3.spec.constructors.find(
    (c) => c.label === label
  ).selector;
  const name = metadata.contract.name;
  const wasm = metadata.source.wasm;
  return { wasm, metadata, constructor, name };
}

async function deployContract(api, txqueue, keyPair, contract, clusterId) {
  console.log(`Contracts: uploading ${contract.name} to cluster ${clusterId}`);
  // upload the contract
  const { events: deployEvents } = await txqueue.submit(
    api.tx.utility.batchAll([
      api.tx.phalaFatContracts.clusterUploadResource(
        clusterId,
        "InkCode",
        contract.wasm
      ),
      api.tx.phalaFatContracts.instantiateContract(
        { WasmCode: contract.metadata.source.hash },
        contract.constructor,
        hex(crypto.randomBytes(4).toString("hex")), // salt
        clusterId
      ),
    ]),
    keyPair
  );
  const contractIds = deployEvents
    .filter(
      (ev) =>
        ev.event.section == "phalaFatContracts" &&
        ev.event.method == "Instantiating"
    )
    .map((ev) => ev.event.data[0].toString());
  const numContracts = 1;
  console.assert(
    contractIds.length == numContracts,
    "Incorrect length:",
    `${contractIds.length} vs ${numContracts}`
  );
  contract.address = contractIds[0];
  await checkUntilEq(
    async () =>
      (
        await api.query.phalaFatContracts.clusterContracts(clusterId)
      ).filter((c) => contractIds.includes(c.toString())).length,
    numContracts,
    4 * 6000
  );
  console.log("Contracts: uploaded");
  await checkUntil(
    async () =>
      (
        await api.query.phalaRegistry.contractKeys(contract.address)
      ).isSome,
    4 * 6000
  );
  console.log("Contracts:", contract.address, "key ready");
  console.log(`Contracts: ${contract.name} deployed`);
  return contract.address;
}

async function setLogHanlder(api, txqueue, pair, clusterId, system, contract) {
  const { events } = await txqueue.submit(
    api.tx.phalaFatContracts.clusterSetLogHandler(clusterId, contract),
    pair
  );

  await txqueue.submit(
    system.tx["system::setDriver"]({}, "PinkLogger", contract),
    pair
  );

  await checkUntilEq(
    async () =>
      events.filter(
        (ev) =>
          ev.event.section == "phalaFatContracts" &&
          ev.event.method == "ClusterSetLogReceiver"
      ).length,
    1
  );

  const certAlice = await Phala.signCertificate({ api, pair });
  await checkUntilEq(async () => {
    const { output } = await system.query["system::getDriver"](
      certAlice,
      {},
      "PinkLogger"
    );
    return output.toHex();
  }, contract);

  console.log("Cluster: Log hander set");
}

async function uploadSystemCode(api, txqueue, pair, wasm) {
  console.log(`Uploading system code`);
  await txqueue.submit(
    api.tx.sudo.sudo(api.tx.phalaFatContracts.setPinkSystemCode(hex(wasm))),
    pair
  );
  console.log(`Uploaded system code`);
}

module.exports = {
  loadContractFile,
  deployContract,
  setLogHanlder,
  uploadSystemCode,
};
