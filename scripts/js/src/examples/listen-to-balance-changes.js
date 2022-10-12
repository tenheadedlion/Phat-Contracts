// Import the API
const { ApiPromise, WsProvider } = require("@polkadot/api");

// Known account we want to use (available on dev chain, with funds)
const Alice = "45R2pfjQUW2s9PQRHU48HQKLKHVMaDja7N3wpBtmF28UYDs2";



/*
example result:

You may leave this example running and start example 06 or transfer any value to 45R2pfjQUW2s9PQRHU48HQKLKHVMaDja7N3wpBtmF28UYDs2
New balance change of -1000242922159, nonce 10
New balance change of 111111000000000000, nonce 10

*/

async function main() {
  const wsProvider = new WsProvider("ws://localhost:19944");
  // Create an await for the API
  const api = await ApiPromise.create({
    provider: wsProvider,
  });

  // Retrieve the initial balance. Since the call has no callback, it is simply a promise
  // that resolves to the current on-chain value
  let {
    data: { free: previousFree },
    nonce: previousNonce,
  } = await api.query.system.account(Alice);

  console.log(
    `${Alice} has a balance of ${previousFree}, nonce ${previousNonce}`
  );
  console.log(
    `You may leave this example running and start example 06 or transfer any value to ${Alice}`
  );

  // Here we subscribe to any balance changes and update the on-screen value
  api.query.system.account(
    Alice,
    ({ data: { free: currentFree }, nonce: currentNonce }) => {
      // Calculate the delta
      const change = currentFree.sub(previousFree);

      // Only display positive value changes (Since we are pulling `previous` above already,
      // the initial balance change will also be zero)
      if (!change.isZero()) {
        console.log(`New balance change of ${change}, nonce ${currentNonce}`);

        previousFree = currentFree;
        previousNonce = currentNonce;
      }
    }
  );
}

main().catch(console.error);
