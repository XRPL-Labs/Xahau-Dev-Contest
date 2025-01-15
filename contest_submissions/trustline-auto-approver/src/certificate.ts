
import {
    sign
} from "@transia/ripple-keypairs";

function stringToHex(message: string): string {
    return Buffer.from(message, 'utf8').toString('hex').toUpperCase();
}

const keypair = {
    privateKey: "EDB4C4E046826BD26190D09715FC31F4E6A728204EADD112905B08B14B7F15C4F3",
    publicKey: "ED01FA53FA5A7E77798F882ECE20B1ABC00BB358A9E55A202D0D0676BD0CE37A63"
};

export async function main(): Promise<void> {

    const address = process.argv[2];

    if (!address) {
        console.error("Please provide an address as an argument.");
        process.exit(1);
    };

    const message = `KYC_APPROVED|${address}`;
    const messageHex = stringToHex(message);
    const signature = sign(messageHex, keypair.privateKey);
    console.log("Signature:", signature);
    console.log("Public Key:", keypair.publicKey);
    console.log("Message:", messageHex);
}

main();
