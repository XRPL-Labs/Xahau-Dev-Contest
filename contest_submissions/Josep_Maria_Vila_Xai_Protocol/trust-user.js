var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
var XrplClient = require("xrpl-client").XrplClient;
var lib = require("xrpl-accountlib");
var keypairs = require("ripple-keypairs");
/**
 * @input {Account.secret} user_secret User Account
 * @input {Account} hook_account Hook Account
 */
var user_secret = "sEdVHbzvHkB1UQRUZeSguqxbPVjbPK8";
var hook_account = "raMwbSDjxg9s1mQBtnHWuV54jDxirVB9o8";
var user_keypair = lib.derive.familySeed(user_secret);
var user_account = keypairs.deriveAddress(user_keypair.keypair.publicKey);
//const client = new XrplClient("wss://hooks-testnet-v3.xrpl-labs.com");
var client = new XrplClient("wss://xahau.network");
var main = function () { return __awaiter(_this, void 0, void 0, function () {
    var account_data, tx, signedTransaction, submit;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, client.send({
                    command: "account_info",
                    account: user_account,
                })];
            case 1:
                account_data = (_a.sent()).account_data;
                if (!account_data) {
                    console.log("Account not found.");
                    client.close();
                    return [2 /*return*/];
                }
                tx = {
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
                signedTransaction = lib.sign(tx, user_keypair).signedTransaction;
                return [4 /*yield*/, client.send({
                        command: "submit",
                        tx_blob: signedTransaction,
                    })];
            case 2:
                submit = _a.sent();
                console.log(submit);
                console.log("Shutting down...");
                client.close();
                return [2 /*return*/];
        }
    });
}); };
main();
//# sourceMappingURL=trust-user.js.map