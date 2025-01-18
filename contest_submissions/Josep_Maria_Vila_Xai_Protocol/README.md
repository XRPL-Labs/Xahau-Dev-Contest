XAI PROTOCOL

Xai hook protocol provides an automated way to issue and redeem XAI, an over-collateralised stablecoin backed with XAH.

Sending XAH to it creates a vault and sends back the corresponding amount of XAI stablecoin based on the current XAH price. XAI can be redeemed at any time against the vault to get back the original XAH.

The exchange rate between XAH and XAI stablecoin is the limit set on a trustline established between two special oracle accounts. A way to update automatically and continuosly that rate according to the current market XAH price should be developed, it's not present yet in the current project.

If the value of XAH falls too far, the vault gets under a minimum collateralization threshold. This means anyone who wants to top up the vault above the threshold can come along and take it over.

Carol = issuer of the XAI stablecoin, user send XAH to this account which is the hook account:
https://xahau.xrplwin.com/account/r9DSnJkkyva4NdShyxw32Q217B7PMZuB9c
https://xahauexplorer.com/explorer/r9DSnJkkyva4NdShyxw32Q217B7PMZuB9c

Alice = XAI stablecoin user, sends XAH to the hook to use it as collateral to obtain XAI:
https://xahau.xrplwin.com/account/rsF3rBFyQP2zCheJ2woHv46XHvUyKVRK86
https://xahauexplorer.com/explorer/rsF3rBFyQP2zCheJ2woHv46XHvUyKVRK86

Carlos = oracle that stablishes XAH price, low account = oracle_lo =
https://xahau.xrplwin.com/account/rHBsTkCaTR86RGKVt3bTUhZAu2NSTZbNSv
https://xahauexplorer.com/explorer/rHBsTkCaTR86RGKVt3bTUhZAu2NSTZbNSv

Charlie = oracle that stablishes XAH price, high account = oracle_hi =
https://xahau.xrplwin.com/account/rJ2GzPBeCoK9NjmJ9vcVntVj2poEvjfvEv
https://xahauexplorer.com/explorer/rJ2GzPBeCoK9NjmJ9vcVntVj2poEvjfvEv

To test:

At least 4 accounts are required: Alice, Carol, Carlos and Charlie.

Run decode.js, twice, to convert Carlos and Charlie accounts to binary form; save the values somewhere. You can obtain the same result using this tool:
https://hooks.services/tools/raddress-to-accountid

If the Carlos account number (the "Account index" number) is numerically higher than Charlie, switch the accounts (either re-import them, or just switch their names in the following text).

Set up trust limit for the stablecoin user, by running trust-user.js; the script requires 2 parameters:
The user account (Alice) sends the TrustSet transaction, so that the script requires its private key.
The hook account (Carol) is set up as the trusted issuer.
https://xahauexplorer.com/explorer/61CADE17601483D84DC6BF28EC16634A31FC18101E2551806533EE990657D197

Set up trust limit on the oracle, by running trust-oracle.js; the script requires 2 parameters:
The low account (Carlos) sends the TrustSet transaction, so that the script requires its private key.
The high account (Charlie) is set up as the trusted issuer.
https://xahauexplorer.com/explorer/136D9947C156DA3646A37C8539D4984CFC4D6C293130EC63FF465F64DD8DBF91

The file xai.c contains the hook and it has to be deployed to Carol account (hook account, issuer), it uses "ttPayment" on "Invoke on transactions" and these 2 parameters:
Parameter 1. "oracle_lo" set to Carlos (low oracle) binary account.
Parameter 2. "oracle_hi" set to the Charlie (high oracle) binary account.
https://xahau.xrplwin.com/account/r9DSnJkkyva4NdShyxw32Q217B7PMZuB9c/hooks

Set up a payment transaction from Alice (which sends the amount of XAH she wants to collateralize) to Carol (hook, issuer). The hook will issue-mint and send back the corresponding XAI stablecoin amount.

From now on any user-account can collateralize XAH and receive XAI stablecoin following these steps:
Step 1: set the XAI trustline on the user-account.
Step 2: sent a XAH payment from the user-account to Carol-hook-issuer account.

How to take over a vault? (pending)
