const { ApiPromise, WsProvider, Keyring } = require("@polkadot/api");
const { ContractPromise } = require("@polkadot/api-contract");
const Phala = require("@phala/sdk");
const fs = require("fs");
const config = require("./config.json");

const { TxQueue, checkUntil, hex } = require("./utils");
const {
  loadContractDir,
  loadContractFile,
  deployContract,
  setLogHanlder,
  uploadSystemCode,
} = require("./common");
const { fstat } = require("fs");

async function getWorkerPubkey(api) {
  const workers = await api.query.phalaRegistry.workers.entries();
  const worker = workers[0][0].args[0].toString();
  return worker;
}

async function setupGatekeeper(api, txpool, pair, worker) {
  if ((await api.query.phalaRegistry.gatekeeper()).length > 0) {
    return;
  }
  console.log("Gatekeeper: registering");
  await txpool.submit(
    api.tx.sudo.sudo(api.tx.phalaRegistry.registerGatekeeper(worker)),
    pair
  );
  await checkUntil(
    async () => (await api.query.phalaRegistry.gatekeeper()).length == 1,
    4 * 6000
  );
  console.log("Gatekeeper: added");
  await checkUntil(
    async () => (await api.query.phalaRegistry.gatekeeperMasterPubkey()).isSome,
    4 * 6000
  );
  console.log("Gatekeeper: master key ready");
}

async function deployCluster(
  api,
  txqueue,
  sudoer,
  owner,
  worker,
  defaultCluster = "0x0000000000000000000000000000000000000000000000000000000000000000"
) {
  const clusterInfo = await api.query.phalaFatContracts.clusters(
    defaultCluster
  );
  if (clusterInfo.isSome) {
    return {
      clusterId: defaultCluster,
      systemContract: clusterInfo.unwrap().systemContract.toHex(),
    };
  }
  console.log("Cluster: creating");
  // crete contract cluster and wait for the setup
  const { events } = await txqueue.submit(
    api.tx.sudo.sudo(
      api.tx.phalaFatContracts.addCluster(
        owner,
        "Public", // can be {'OnlyOwner': accountId}
        [worker]
      )
    ),
    sudoer
  );
  const ev = events[1].event;
  console.assert(
    ev.section == "phalaFatContracts" && ev.method == "ClusterCreated"
  );
  console.log(ev);
  const clusterId = ev.data[0].toString();
  const systemContract = ev.data[1].toString();
  console.log("Cluster: created", clusterId);
  await checkUntil(
    async () => (await api.query.phalaRegistry.clusterKeys(clusterId)).isSome,
    4 * 6000
  );
  await checkUntil(
    async () =>
      (
        await api.query.phalaRegistry.contractKeys(systemContract)
      ).isSome,
    4 * 6000
  );
  return { clusterId, systemContract };
}

async function main() {
  console.log("Current directory:", process.cwd());

  const contractSystem = loadContractFile(
    "./scripts/js/src/res/pink_system.contract",
    "default"
  );

  const provider = config.provider;
  // connect to the chain
  const wsProvider = new WsProvider(provider);
  const api = await ApiPromise.create({
    provider: wsProvider,
    // consider removing this
    types: {
      ...Phala.types,
    },
  });
  const txqueue = new TxQueue(api);

  // prepare accounts
  const keyring = new Keyring({ type: "sr25519" });
  const alice = keyring.addFromUri("//Alice");

  console.log(alice);

  // connect to pruntime
  const pruntimeURL = config.pruntimeURL;
  const prpc = Phala.createPruntimeApi(pruntimeURL);
  const worker = await getWorkerPubkey(api);
  const connectedWorker = hex((await prpc.getInfo({})).publicKey);
  console.log("Worker:", worker);
  console.log("Connected worker:", connectedWorker);

  // basic phala network setup
  await setupGatekeeper(api, txqueue, alice, worker);

  // Upload the pink-system wasm to the chain. It is required to create a cluster.
  await uploadSystemCode(api, txqueue, alice, contractSystem.wasm);

  const { clusterId, systemContract } = await deployCluster(
    api,
    txqueue,
    alice,
    alice.address,
    worker
  );

  const jsonDump = {
    provider: config.provider,
    pruntimeURL: config.pruntimeURL,
    clusterId: clusterId,
  };

  fs.writeFileSync(
    `./scripts/js/src/keyring.json`,
    JSON.stringify(alice.toJson())
  );
  fs.writeFileSync(`./scripts/js/src/config.json`, JSON.stringify(jsonDump));

  const dir = "./target/contract_jsons/";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

main()
  .then(process.exit)
  .catch((err) => console.error("Crashed", err))
  .finally(() => process.exit(-1));
