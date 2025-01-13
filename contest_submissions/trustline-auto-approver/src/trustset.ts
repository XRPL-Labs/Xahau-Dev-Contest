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
    const signature = process.argv[2];

    if (!signature) {
        console.error("Please provide a signature as an argument.");
        process.exit(1);
    };

    await client.connect();
    client.networkID = await client.getNetworkID();

    const issuerSeed = process.env.ISSUER_SEED;
    const userSeed = process.env.USER_SEED;
    const issuer_wallet = Wallet.fromSeed(issuerSeed!);
    const user_wallet = Wallet.fromSeed(userSeed!);
    
    // Set the trustline
    const trustSetTx: Transaction = {
        TransactionType: "TrustSet",
            Account: user_wallet.classicAddress,
            LimitAmount: {
                currency: "USD",
                issuer: issuer_wallet.classicAddress,
                value: "100000000"
            },
            Memos: [{
                Memo: {
                    MemoType: "53",
                    MemoData: signature
                }
            }]
    };
  
    const result = await Xrpld.submit(client, {
      wallet: user_wallet,
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