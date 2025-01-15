import { DOESNT_EXIST, INTERNAL_ERROR, NOT_AUTHORIZED, SUCCESS } from "jshooks-api";
import { Transaction } from '@transia/xahau-models'
import { encodeString, getOtxnParam, uint8ArrayToString } from './helpers'

const Hook = (arg: number) => {
  // Get the transaction
  const txn = otxn_json() as Transaction

  trace("Trustline-Approver.c: Called.", 0, false);

  etxn_reserve(1);

  switch (txn.TransactionType) {
    // If the transaction is a TrustSet
    case "TrustSet":
      trace("Trustline-Approver.c: TrustSet.", 0, false);

      if (state(encodeString("K")) === DOESNT_EXIST) {
        return rollback(`Trustline-Approver: Please initialize the hook with the Certificate issuer Public Key.`, DOESNT_EXIST);
      }

      // TODO!: Message format KYC_APPROVED|<address>
      const verification = util_verify(
        "4b59435f415050524f5645447c7277656b6657344d695335795a6a5841535242447a7a505057594b7548764b503745",
        txn.Memos?.[0].Memo.MemoData as string,
        uint8ArrayToString(new Uint8Array(state(encodeString("K")) as number[])).toUpperCase()
      );

      if (verification === 1 ) {
        const prepared: Transaction = prepare({
          TransactionType: "TrustSet",
          LimitAmount: {
            currency: "USD",
            issuer: txn.Account,
            value: String(Number(100_000_000)),
          },
        });
      
        trace("Prepared TX", prepared)
        
        const emitted = emit(prepared);
      
        trace("Emitted", emitted);
      } else {
        return rollback(`Trustline-Approver: Signature is invalid.`, NOT_AUTHORIZED);
      }

      break;

    case "Invoke":
      trace("Trustline-Approver.c: Invoke.", 0, false);
      let newIssuerKey = getOtxnParam("K");
      if (newIssuerKey === DOESNT_EXIST) {
        return rollback(`Trustline-Approver: No issuer key found in payload.`, DOESNT_EXIST);
      }
      const setState = state_set(uint8ArrayToString(new Uint8Array(newIssuerKey as number[])), encodeString("K"));
      if (setState < 0) {
        return rollback(`Trustline-Approver: Could not set state.`, INTERNAL_ERROR);
      }
      break;
  }

  return accept("Trustline-Approver: Finished", SUCCESS);
};

export { Hook };