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
    const client = new Client(process.env.XRPLD_WSS || "");
    const publicKey = process.argv[2];

    if (!publicKey) {
        console.error("Please provide a public key as an argument.");
        process.exit(1);
    };

    await client.connect();
    client.networkID = await client.getNetworkID();
  
    // Set the issuer Hook
    const issuer_wallet = Wallet.fromSeed(process.env.ISSUER_SEED || "");

    // Set the trustline approver Hook
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
    //console.log(hookExecutions.executions[0].HookReturnString);
    await client.disconnect();
  }
  
  main();