import {
    Client,
    Wallet,
    TransactionMetadata,
    Transaction,
  } from "@transia/xrpl";
  import {
    Xrpld,
    ExecutionUtility,
  } from "@transia/hooks-toolkit";
  import "dotenv/config";
  
  export async function main(): Promise<void> {
   
    if (!process.env.XRPLD_WSS) {
      console.error("Please provide the XRPLD_WSS environment variable.");
      process.exit(1);
    }

    const client = new Client(process.env.XRPLD_WSS);

    const publicKey = process.argv[2];

    if (!publicKey) {
        console.error("Please provide a public key as an argument.");
        process.exit(1);
    };

    await client.connect();
    client.networkID = await client.getNetworkID();
  
    // Set the issuer Hook
    if (!process.env.ISSUER_SEED) {
      console.error("Please provide the ISSUER_SEED environment variable.");
      process.exit(1);
    }
    const issuer_wallet = Wallet.fromSeed(process.env.ISSUER_SEED);

    // Invoke to set the Certificate Issuing Public Key
    const trustSetTx: Transaction = {
        TransactionType: "Invoke",
        Account: issuer_wallet.classicAddress,
        Fee: "105000",
        HookParameters: [
          {
            HookParameter: {
              HookParameterName: "4B", // K
              HookParameterValue: publicKey
            }
          }
        ]
    };

    const result = await Xrpld.submit(client, {
      wallet: issuer_wallet,
      tx: trustSetTx,
    });
  
    console.log(result);
  
    const hookExecutions = await ExecutionUtility.getHookExecutionsFromMeta(
      client,
      result.meta as TransactionMetadata
    );
  
    console.log(hookExecutions);

    await client.disconnect();
  }
  
  main();