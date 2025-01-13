import {
  Client,
  Wallet,
  Invoke,
  SetHookFlags,
  TransactionMetadata,
  Transaction,
  AccountSet,
  AccountSetAsfFlags,
} from "@transia/xrpl";
import {
  createHookPayload,
  setHooksV3,
  SetHookParams,
  Xrpld,
  clearHookStateV3,
  hexNamespace,
  iHook,
} from "@transia/hooks-toolkit";
import "dotenv/config";

export async function main(): Promise<void> {
  const client = new Client(process.env.XRPLD_WSS || "");
  const namespace = "trustline-approver";
  await client.connect();
  client.networkID = await client.getNetworkID();

  // Set the issuer Hook
  const issuerSeed = process.env.ISSUER_SEED;
  const userSeed = process.env.USER_SEED;
  const issuer_wallet = Wallet.fromSeed(issuerSeed!);
  const user_wallet = Wallet.fromSeed(userSeed!);
  console.log("Issuer:", issuer_wallet.classicAddress, "User:", user_wallet.classicAddress);

  const clearHook = {
    Flags: SetHookFlags.hsfNSDelete,
    HookNamespace: hexNamespace(namespace),
  } as iHook;

  await clearHookStateV3({
    client,
    seed: issuerSeed,
    hooks: [{ Hook: clearHook }, { Hook: clearHook }],
  } as SetHookParams);

  console.log("Hook cleared!");

  // Setting Weak TSH
  const issuer_account_set_collect_tx: AccountSet = {
    TransactionType: 'AccountSet',
    Account: issuer_wallet.classicAddress,
    SetFlag: AccountSetAsfFlags.asfTshCollect,
  };
  
  // Enabling Require Auth
  const issuer_account_set_auth_tx: AccountSet = {
    TransactionType: 'AccountSet',
    Account: issuer_wallet.classicAddress,
    SetFlag: AccountSetAsfFlags.asfRequireAuth,
  };

  const response_issuer_auth_set = await Xrpld.submit(client, {
    wallet: issuer_wallet,
    tx: issuer_account_set_auth_tx,
  });

  console.log(
    "Issuer Account Set Auth:",
    (response_issuer_auth_set.meta as TransactionMetadata).TransactionResult
  );

  const response_issuer_collect_set = await Xrpld.submit(client, {
    wallet: issuer_wallet,
    tx: issuer_account_set_collect_tx,
  });

  console.log(
    "Issuer Account Set Collect:",
    (response_issuer_collect_set.meta as TransactionMetadata).TransactionResult
  );

  const hook = createHookPayload({
    version: 1,
    createFile: "trustline-approver",
    namespace: "trustline-approver",
    flags: SetHookFlags.hsfCollect + SetHookFlags.hsfOverride,
    hookOnArray: ["TrustSet", "Invoke"],
    fee: "100000",
  });
  
  await setHooksV3({
    client: client,
    seed: issuer_wallet.seed,
    hooks: [{ Hook: hook }],
  } as SetHookParams);

  console.log("Hook set!");

  await client.disconnect();
}

main();