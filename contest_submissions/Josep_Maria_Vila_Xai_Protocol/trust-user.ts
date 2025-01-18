const { XrplClient } = require("xrpl-client");

const lib = require("xrpl-accountlib");
const keypairs = require("ripple-keypairs");

/**
 * @input {Account.secret} user_secret User Account
 * @input {Account} hook_account Hook Account
 */

const user_secret = "sEdVHbzvHkB1UQRUZeSguqxbPVjbPK8";
const hook_account = "raMwbSDjxg9s1mQBtnHWuV54jDxirVB9o8";

const user_keypair = lib.derive.familySeed(user_secret);
const user_account = keypairs.deriveAddress(user_keypair.keypair.publicKey);

//const client = new XrplClient("wss://hooks-testnet-v3.xrpl-labs.com");
const client = new XrplClient("wss://xahau.network");

const main = async () => {
  const { account_data } = await client.send({
    command: "account_info",
    account: user_account,
  });
  if (!account_data) {
    console.log("Account not found.");
    client.close();
    return;
  }

  const tx = {
    TransactionType: "TrustSet",
    Account: user_account,
    Fee: "12",
    Flags: 262144,
    LimitAmount: {
      currency: "USD",
      issuer: hook_account,
      value: "10000000000",
    },
    Sequence: account_data.Sequence,
    //NetworkID: "21338",
    NetworkID: "21337",
  };

  const { signedTransaction } = lib.sign(tx, user_keypair);
  const submit = await client.send({
    command: "submit",
    tx_blob: signedTransaction,
  });
  console.log(submit);

  console.log("Shutting down...");
  client.close();
};

main();
