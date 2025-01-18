const { XrplClient } = require("xrpl-client");

const lib = require("xrpl-accountlib");
const keypairs = require("ripple-keypairs");

/**
 * @input {Account.secret} low_secret Low Account
 * @input {Account} high_account High Account
 */

const low_secret = "sEd7RN8PyQq917vzAda1qZzrTFtbM9Z";
const high_account = "rwznosJSWdhQG17K13y2ZNbS3JRLcusdDV";

const low_keypair = lib.derive.familySeed(low_secret);
const low_account = keypairs.deriveAddress(low_keypair.keypair.publicKey);

console.log(low_account);
console.log(high_account);

//const client = new XrplClient("wss://hooks-testnet-v3.xrpl-labs.com");
const client = new XrplClient("wss://xahau.network");

const main = async () => {
  const { account_data } = await client.send({
    command: "account_info",
    account: low_account,
  });
  if (!account_data) {
    console.log("Account not found.");
    client.close();
    return;
  }

  const tx = {
    TransactionType: "TrustSet",
    Account: low_account,
    Fee: "12",
    Flags: 262144,
    LimitAmount: {
      currency: "USD",
      issuer: high_account,
      value: "2", // $/XAH
    },
    Sequence: account_data.Sequence,
    //NetworkID: "21338",
    NetworkID: "21337",
  };

  const { signedTransaction } = lib.sign(tx, low_keypair);
  const submit = await client.send({
    command: "submit",
    tx_blob: signedTransaction,
  });
  console.log(submit);

  console.log("Shutting down...");
  client.close();
};

main();
