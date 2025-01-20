/**
 * xai.c - Xai Protocol, an oracle based stablecoin hook on the Xahau network
 *
 * Author: Josep Maria Vila based on Richard Holland peggy hook code
 * Date: 12 January 2025
 *
 **/

#include <stdint.h>
#include "hookapi.h"

// your vault starts at 200% collateralization
#define NEW_COLLATERALIZATION_NUMERATOR 2
#define NEW_COLLATERALIZATION_DENOMINATOR 4 

// at 117% collateralization your vault may be taken over
#define LIQ_COLLATERALIZATION_NUMERATOR 5
#define LIQ_COLLATERALIZATION_DENOMINATOR 6

int64_t hook(uint32_t reserved)
{
    etxn_reserve(1);

    uint8_t currency[20] = {0,0,0,0, 0,0,0,0, 0,0,0,0, 'X', 'A', 'I', 0,0,0,0,0};

    // get the account the hook is running on and the account that created the txn
    uint8_t hook_accid[20];
    hook_account(SBUF(hook_accid));

    uint8_t otxn_accid[20];
    int32_t otxn_accid_len = otxn_field(SBUF(otxn_accid), sfAccount);
    if (otxn_accid_len < 20)
        rollback(SBUF("Xai: sfAccount field missing!!!"), 10);

    // get the source tag if any... negative means it wasn't provided
    int64_t source_tag = otxn_field(0,0, sfSourceTag);
    if (source_tag < 0)
        source_tag = 0xFFFFFFFFU;

    // compare the "From Account" (sfAccount) on the transaction with the account the hook is running on
    int equal = 0; BUFFER_EQUAL(equal, hook_accid, otxn_accid, 20);
    if (equal)
        accept(SBUF("Xai: Outgoing transaction"), 20);

    // invoice id if present is used for taking over undercollateralized vaults
    // format: { 20 byte account id | 4 byte tag [FFFFFFFFU if absent] | 8 bytes of 0 }
    uint8_t invoice_id[32];
    int64_t invoice_id_len = otxn_field(SBUF(invoice_id), sfInvoiceID);

    // check if a trustline exists between the sender and the hook for the XAI currency [ XAI ]
    uint8_t keylet[34];
    if (util_keylet(SBUF(keylet), KEYLET_LINE, SBUF(hook_accid), SBUF(otxn_accid), SBUF(currency)) != 34)
        rollback(SBUF("Xai: Internal error, could not generate keylet"), 10);
    
    int64_t user_peggy_trustline_slot = slot_set(SBUF(keylet), 0);
    TRACEVAR(user_peggy_trustline_slot);
    if (user_peggy_trustline_slot < 0)
        rollback(SBUF("Xai: You must have a trustline set for XAI to this account."), 10);


    // because the trustline is actually a ripplestate object with a 'high' and a 'low' account
    // we need to compare the hook account with the user's account to determine which side of the line to
    // examine for an adequate limit
    int compare_result = 0;
    ACCOUNT_COMPARE(compare_result, hook_accid, otxn_accid);
    if (compare_result == 0)
        rollback(SBUF("Xai: Invalid trustline set hi=lo?"), 1);

    int64_t lim_slot = slot_subfield(user_peggy_trustline_slot, ((compare_result > 0) ? sfLowLimit : sfHighLimit), 0); 
    if (lim_slot < 0)
        rollback(SBUF("Xai: Could not find sfLowLimit on oracle trustline"), 20);

    int64_t user_trustline_limit = slot_float(lim_slot);
    if (user_trustline_limit < 0)
        rollback(SBUF("Xai: Could not parse user trustline limit"), 1);

    int64_t required_limit = float_set(10, 1);
    if (float_compare(user_trustline_limit, required_limit, COMPARE_EQUAL | COMPARE_GREATER) != 1)
        rollback(SBUF("Xai: You must set a trustline for XAI to the issuer for limit of at least 10B"), 1);

    // execution to here means the invoking account has the required trustline with the required limit
    // now fetch the price oracle accounts and data (which also lives in a trustline)
    uint8_t oracle_lo[32];
    int64_t prv = hook_param(SBUF(oracle_lo), (uint32_t)"oracle_lo", 9);
    if (prv < 20)
    {
        TRACEVAR(prv);
        rollback(SBUF("Xai: \"oracle_lo\" parameter missing"), 4);
    }

    uint8_t oracle_hi[32];
    prv = hook_param(SBUF(oracle_hi), (uint32_t)"oracle_hi", 9);
    if (prv < 20)
    {
        TRACEVAR(prv);
        rollback(SBUF("Xai: \"oracle_hi\" parameter missing"), 6);
    }

    if (util_keylet(SBUF(keylet), KEYLET_LINE, oracle_lo, 20, oracle_hi, 20, SBUF(currency)) != 34)
        rollback(SBUF("Xai: Internal error, could not generate keylet"), 10);

    int64_t slot_no = slot_set(SBUF(keylet), 0);
    TRACEVAR(slot_no);
    if (slot_no < 0)
        rollback(SBUF("Xai: Could not find oracle trustline"), 10);

    lim_slot = slot_subfield(slot_no, sfLowLimit, 0);
    if (lim_slot < 0)
        rollback(SBUF("Xai: Could not find sfLowLimit on oracle trustline"), 20);

    int64_t exchange_rate = slot_float(lim_slot);
    if (exchange_rate < 0) 
        rollback(SBUF("Xai: Could not get exchange rate float"), 20);
   
    // execution to here means we have retrieved the exchange rate from the oracle (I don't know how to update the price of the oracle to track the real XAH price)
    TRACEXFL(exchange_rate);
   
    // process the amount sent, which could be either XAH or XAI
    // to do this we 'slot' the originating txn, that is: we place it into a slot so we can use the slot api
    // to examine its internals
    int64_t oslot = otxn_slot(0);
    if (oslot < 0)
        rollback(SBUF("Xai: Could not slot originating txn."), 1);

    // specifically we're interested in the amount sent
    int64_t amt_slot = slot_subfield(oslot, sfAmount, 0);
    if (amt_slot < 0)
        rollback(SBUF("Xai: Could not slot otxn.sfAmount"), 2);

    int64_t amt = slot_float(amt_slot);
    if (amt < 0)
        rollback(SBUF("Xai: Could not parse amount."), 1);

    // the slot_type api allows determination of fields and subtypes of fields according to the doco
    // in this case we're examining an amount field to see if it's a native (XAH) amount or an iou amount
    // this means passing flag=1
    int64_t is_xrp = slot_type(amt_slot, 1);
    if (is_xrp < 0)
        rollback(SBUF("Xai: Could not determine sent amount type"), 3);


    // In addition to determining the amount sent (and its type) we also need to handle the "recollateralization"
    // takeover mode. This is where another user, not the original vault owner, passes the vault ID as invoice ID
    // and sends a payment that brings the vault back into a valid state. We then assign ownership to this person
    // as a reward for stablising the vault. So account for this and record whether or not we are proceeding as
    // the original vault owner (or a new vault) or in takeover mode.
    uint8_t is_vault_owner = 1;
    uint8_t vault_key[32] = { 0 };
    if (invoice_id_len != 32)
    {
        // this is normal mode
        for (int i = 0; GUARD(20), i < 20; ++i)
            vault_key[i] = otxn_accid[i];

        UINT32_TO_BUF(vault_key + 20, source_tag);
    }
    else
    {
        // this is the takeover mode
        for (int i = 0; GUARD(24), i < 24; ++i)
            vault_key[i] = invoice_id[i];
        is_vault_owner = 0;
    }

    // check if state currently exists
    uint8_t vault[16];
    int64_t vault_pusd = 0;
    int64_t vault_xrp = 0;
    uint8_t vault_exists = 0;
    if (state(SBUF(vault), SBUF(vault_key)) == 16)
    {
        vault_pusd = float_sto_set(vault, 8);
        vault_xrp  = float_sto_set(vault + 8, 8);
        vault_exists = 1;
    }
    else if (is_vault_owner == 0)
        rollback(SBUF("Xai: You cannot takeover a vault that does not exist!"), 1);

    if (is_xrp)
    {
        // XAH INCOMING
        
        // decide whether the vault is liquidatable
        int64_t required_vault_xrp = float_divide(vault_pusd, exchange_rate);
        required_vault_xrp =
            float_mulratio(required_vault_xrp, 0, LIQ_COLLATERALIZATION_DENOMINATOR, LIQ_COLLATERALIZATION_NUMERATOR);
        uint8_t can_liq = (required_vault_xrp < vault_xrp);
        
        // compute new vault XAH by adding the XAH they just sent
        vault_xrp = float_sum(amt, vault_xrp);

        // compute the maximum amount of XAI that can be out according to the collateralization
        int64_t max_vault_pusd = float_multiply(vault_xrp, exchange_rate);
        max_vault_pusd =
            float_mulratio(max_vault_pusd, 0, NEW_COLLATERALIZATION_NUMERATOR, NEW_COLLATERALIZATION_DENOMINATOR);

        // compute the amount we can send them
        int64_t pusd_to_send =
            float_sum(max_vault_pusd, float_negate(vault_pusd));
        if (pusd_to_send < 0)
            rollback(SBUF("Xai: Error computing XAI to send"), 1);

        // is the amount to send negative, that means the vault is undercollateralized
        if (float_compare(pusd_to_send, 0, COMPARE_LESS))
        {
            if (!is_vault_owner)
                rollback(SBUF("Xai: Vault is undercollateralized and your deposit would not redeem it."), 1);
            else
            {
                if (float_sto(vault + 8, 8, 0,0,0,0, vault_xrp, -1) != 8)
                    rollback(SBUF("Xai: Internal error writing vault"), 1);
                if (state_set(SBUF(vault), SBUF(vault_key)) != 16)
                    rollback(SBUF("Xai: Could not set state"), 1);
                accept(SBUF("Xai: Vault is undercollateralized, absorbing without sending anything."), 0);
            }
        }

        if (!is_vault_owner && !can_liq)
            rollback(SBUF("Xai: Vault is not sufficiently undercollateralized to take over yet."), 2);

        // execution to here means we will send out XAI

        // update the vault
        vault_pusd = float_sum(vault_pusd, pusd_to_send);

        // if this is a takeover we destroy the vault on the old key and recreate it on the new key
        if (!is_vault_owner)
        {
            // destroy 
            if (state_set(0,0,SBUF(vault_key)) < 0)
                rollback(SBUF("Xai: Could not destroy old vault."), 1);

            // reset the key
            CLEARBUF(vault_key);
            for (int i = 0; GUARD(20), i < 20; ++i)
                vault_key[i] = otxn_accid[i];

            vault_key[20] = (uint8_t)((source_tag >> 24U) & 0xFFU);
            vault_key[21] = (uint8_t)((source_tag >> 16U) & 0xFFU);
            vault_key[22] = (uint8_t)((source_tag >>  8U) & 0xFFU);
            vault_key[23] = (uint8_t)((source_tag >>  0U) & 0xFFU);
        }

        // set / update the vault
        if (float_sto(vault, 8, 0,0,0,0, vault_pusd, -1) != 8 ||
            float_sto(vault + 8, 8, 0,0,0,0, vault_xrp, -1) != 8)
            rollback(SBUF("Xai: Internal error writing vault"), 1);

        if (state_set(SBUF(vault), SBUF(vault_key)) != 16)
            rollback(SBUF("Xai: Could not set state"), 1);

        // we need to dump the iou amount into a buffer
        // by supplying -1 as the fieldcode we tell float_sto not to prefix an actual STO header on the field
        uint8_t amt_out[48];
        if (float_sto(SBUF(amt_out), 0, 0, 0, 0, pusd_to_send, -1) < 0)
            rollback(SBUF("Xai: Could not dump pusd amount into sto"), 1);

        // set the currency code and issuer in the amount field
        for (int i = 0; GUARD(20),i < 20; ++i)
        {
            amt_out[i + 28] = hook_accid[i];
            amt_out[i +  8] = currency[i];
        }

        // finally create the outgoing txn
        uint8_t txn_out[PREPARE_PAYMENT_SIMPLE_TRUSTLINE_SIZE];
        PREPARE_PAYMENT_SIMPLE_TRUSTLINE(txn_out, amt_out, otxn_accid, source_tag, source_tag);

        uint8_t emithash[32];
        if (emit(SBUF(emithash), SBUF(txn_out)) < 0)
            rollback(SBUF("Xai: Emitting txn failed"), 1);

        accept(SBUF("Xai: Sent you XAI!"), 0);
    }
    else
    {

        // NON-XAH incoming
        if (!vault_exists)
            rollback(SBUF("Xai: Can only send XAI back to an existing vault."), 1);

        uint8_t amount_buffer[48];
        if (slot(SBUF(amount_buffer), amt_slot) != 48)
            rollback(SBUF("Xai: Could not dump sfAmount"), 1);

        // ensure the issuer is us
        for (int i = 28; GUARD(20), i < 48; ++i)
        {
            if (amount_buffer[i] != hook_accid[i - 28])
                rollback(SBUF("Xai: A currency we didn't issue was sent to us."), 1);
        }

        // ensure the currency is XAI
        for (int i = 8; GUARD(20), i < 28; ++i)
        {
            if (amount_buffer[i] != currency[i - 8])
                rollback(SBUF("Xai: A non XAI currency was sent to us."), 1);
        }

        TRACEVAR(vault_pusd);

        // decide whether the vault is liquidatable
        int64_t required_vault_xrp = float_divide(vault_pusd, exchange_rate);
        required_vault_xrp =
            float_mulratio(required_vault_xrp, 0, LIQ_COLLATERALIZATION_DENOMINATOR, LIQ_COLLATERALIZATION_NUMERATOR);
        uint8_t can_liq = (required_vault_xrp < vault_xrp);


        // compute new vault XAI by adding the XAI they just sent
        vault_pusd = float_sum(float_negate(amt), vault_pusd);

        // compute the maximum amount of XAI that can be out according to the collateralization
        int64_t max_vault_xrp = float_divide(vault_pusd, exchange_rate);
        max_vault_xrp =
            float_mulratio(max_vault_xrp, 0, NEW_COLLATERALIZATION_DENOMINATOR, NEW_COLLATERALIZATION_NUMERATOR);


        // compute the amount we can send them
        int64_t xrp_to_send =
            float_sum(float_negate(max_vault_xrp), vault_xrp);

        if (xrp_to_send < 0)
            rollback(SBUF("Xai: Error computing XAH to send"), 1);

        // is the amount to send negative, that means the vault is undercollateralized
        if (float_compare(xrp_to_send, 0, COMPARE_LESS))
        {
            if (!is_vault_owner)
                rollback(SBUF("Xai: Vault is undercollateralized and your deposit would not redeem it."), 1);
            else
            {
                if (float_sto(vault, 8, 0,0,0,0, vault_pusd, -1) != 8)
                    rollback(SBUF("Xai: Internal error writing vault"), 1);

                if (state_set(SBUF(vault), SBUF(vault_key)) != 16)
                    rollback(SBUF("Xai: Could not set state"), 1);

                accept(SBUF("Xai: Vault is undercollateralized, absorbing without sending anything."), 0);
            }
        }

        if (!is_vault_owner && !can_liq)
            rollback(SBUF("Xai: Vault is not sufficiently undercollateralized to take over yet."), 2);

        // execution to here means we will send out XAI

        // update the vault
        vault_xrp = float_sum(vault_xrp, xrp_to_send);

        // if this is a takeover we destroy the vault on the old key and recreate it on the new key
        if (!is_vault_owner)
        {
            // destroy 
            if (state_set(0,0,SBUF(vault_key)) < 0)
                rollback(SBUF("Xai: Could not destroy old vault."), 1);

            // reset the key
            CLEARBUF(vault_key);
            for (int i = 0; GUARD(20), i < 20; ++i)
                vault_key[i] = otxn_accid[i];

            vault_key[20] = (uint8_t)((source_tag >> 24U) & 0xFFU);
            vault_key[21] = (uint8_t)((source_tag >> 16U) & 0xFFU);
            vault_key[22] = (uint8_t)((source_tag >>  8U) & 0xFFU);
            vault_key[23] = (uint8_t)((source_tag >>  0U) & 0xFFU);
        }

        // set / update the vault
        if (float_sto(vault, 8, 0,0,0,0, vault_pusd, -1) != 8 ||
            float_sto(vault + 8, 8, 0,0,0,0, max_vault_xrp, -1) != 8)
            rollback(SBUF("Xai: Internal error writing vault"), 1);

        if (state_set(SBUF(vault), SBUF(vault_key)) != 16)
            rollback(SBUF("Xai: Could not set state"), 1);

        // RH TODO: check the balance of the hook account

        // finally create the outgoing txn
        uint8_t txn_out[PREPARE_PAYMENT_SIMPLE_SIZE];
        PREPARE_PAYMENT_SIMPLE(txn_out, float_int(xrp_to_send, 6, 0), otxn_accid, source_tag, source_tag);

        uint8_t emithash[32];
        if (emit(SBUF(emithash), SBUF(txn_out)) < 0)
            rollback(SBUF("Xai: Emitting txn failed"), 1);

        accept(SBUF("Xai: Sent you XAH!"), 0);
    }
    return 0;
}
