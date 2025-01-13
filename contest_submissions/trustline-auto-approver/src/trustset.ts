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
    const wssUrl = process.env.XRPLD_WSS;
    if (!wssUrl) {
        console.error("XRPLD_WSS environment variable is not defined.");
        process.exit(1);
    }
    const client = new Client(wssUrl);
    const signature = process.argv[2];

    if (!signature) {
        console.error("Please provide a signature as an argument.");
        process.exit(1);
    }

    await client.connect();
    client.networkID = await client.getNetworkID();

    const userSeed = process.env.USER_SEED;
    if (!userSeed) {
        console.error("USER_SEED environment variable is not defined.");
        process.exit(1);
    }
    const issuerSeed = process.env.ISSUER_SEED;
    if (!issuerSeed) {
        console.error("ISSUER_SEED environment variable is not defined.");
        process.exit(1);
    }
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
                MemoType: "53", // S in HEX
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