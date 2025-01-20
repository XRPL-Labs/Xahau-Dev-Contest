const rac = require("ripple-address-codec");

/**
 * @input {Account} an Account tool to convert raddress to binary form = raddress to accountID
 */

const a = "r3YZ9DroBpszAQCqBnmk1ny2HcLJs79GcL",
      b = rac.decodeAccountID(a),
      h = b.toString('hex').toUpperCase();

console.log(h);

/*const a = process.env.a,
      b = rac.decodeAccountID(a),
      h = b.toString('hex').toUpperCase();*/
