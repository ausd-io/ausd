# ausCashAddr.js: The ausCash address format for Node.js and web browsers.

[![NPM](https://nodei.co/npm/auscashaddrjs.png?downloads=true)](https://nodei.co/npm/auscashaddrjs/)

JavaScript implementation for CashAddr address format for ausCash.

Compliant with the original CashAddr [specification](https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/cashaddr.md) which improves upon [BIP 173](https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki).

## Installation

### Using NPM

```bsh
$ npm install --save auscashaddrjs
```

### Manually

You may also download the distribution file manually and place it within your third-party scripts directory: [dist/cashaddrjs.min.js](https://unpkg.com/auscashaddrjs/dist/cashaddrjs.min.js).

## Usage

Convert a `bitcoincash:` prefixed address to an `auscash:` prefixed address

### In Node.js

```javascript
const auscashaddr = require('auscashaddrjs');
const bitcoincashAddress =
    'bitcoincash:qpadrekpz6gjd8w0zfedmtqyld0r2j4qmuj6vnmhp6';
const { prefix, type, hash } = auscashaddr.decode(bitcoincashAddress);
console.log(prefix); // 'bitcoincash'
console.log(type); // 'P2PKH'
console.log(hash); // Uint8Array [ 118, 160, ..., 115 ]
console.log(auscashaddr.encode('auscash', type, hash));
// 'auscash:qpadrekpz6gjd8w0zfedmtqyld0r2j4qmuthccqd8d'
console.log(auscashaddr.isValidCashAddress(bitcoincashAddress)); // true
console.log(auscashaddr.isValidCashAddress(bitcoincashAddress), 'bitcoincash'); // true
console.log(auscashaddr.isValidCashAddress(bitcoincashAddress), 'auscash'); // false
// getOutputScriptFromAddress
// p2pkh
console.log(
    auscashaddr.getOutputScriptFromAddress(
        'auscash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr',
    ),
); // 76a9144e532257c01b310b3b5c1fd947c79a72addf852388ac
// p2sh
console.log(
    auscashaddr.getOutputScriptFromAddress(
        'auscash:prfhcnyqnl5cgrnmlfmms675w93ld7mvvqd0y8lz07',
    ),
); // a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087
```

### Working with chronik-client in Node.js

[chronik](https://www.npmjs.com/package/chronik-client) is the reference indexer for ausCash. It queries the blockchain using address hash160 and type parameters.

The `type` and `hash` parameters can be returned in a format ready for chronik by calling `cashaddr.decode(address, true)`

```javascript
const auscashaddr = require('auscashaddrjs');
const { ChronikClient } = require('chronik-client');
const chronik = new ChronikClient('https://chronik.be.cash/xec');
const chronikQueryAddress = 'auscash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035';
const { prefix, type, hash } = auscashaddr.decode(chronikQueryAddress, true);
console.log(prefix); // 'auscash'
console.log(type); // 'p2pkh' (instead of 'P2PKH', returned without the 'true' flag)
console.log(hash); // '95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d' (instead of Uint8Array [ 149, 241, ..., 29 ], returned without the 'true' flag)
console.log(auscashaddr.encode('auscash', type, hash)); // encode supports chronik output inputs
// 'auscash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035'
// use chronik client to get a page of address tx history
const history = await chronik
    .script(type, hash)
    .history(/*page=*/ 0, /*page_size=*/ 10);
```

### React

```javascript
import cashaddr from 'auscashaddrjs';

function convertBitcoincashToAuscash(bitcoincashAddress) {
    /* NOTE
  This function assumes input parameter 'bitcoincashAddress' is a valid bitcoincash: address
  cashaddr.decode() will throw an error if 'bitcoincashAddress' lacks a prefix
  */
    const { prefix, type, hash } = cashaddr.decode(bitcoincashAddress);
    const auscashAddress = cashaddr.encode('auscash', type, hash);
    return auscashAddress;
}
```

### Browser

```html
<html>
    <head>
        <script src="https://unpkg.com/auscashaddrjs/dist/cashaddrjs.min.js"></script>
    </head>
    <body>
        <script>
            function convertBitcoincashToAuscash(bitcoincashAddress) {
                /* NOTE
    This function assumes input parameter 'bitcoincashAddress' is a valid bitcoincash: address
    cashaddr.decode() will throw an error if 'bitcoincashAddress' lacks a prefix
    */
                const { prefix, type, hash } =
                    cashaddr.decode(bitcoincashAddress);
                const auscashAddress = cashaddr.encode('auscash', type, hash);
                return auscashAddress;
            }
            const ausCashAddr = convertBitcoincashToAuscash(
                'bitcoincash:qpadrekpz6gjd8w0zfedmtqyld0r2j4qmuj6vnmhp6',
            );
            console.log(ausCashAddr);
            // auscash:qpadrekpz6gjd8w0zfedmtqyld0r2j4qmuthccqd8d
        </script>
    </body>
</html>
```

#### Script Tag

You may include a script tag in your HTML and the `auscashaddr` module will be defined globally on subsequent scripts.

```html
<html>
    <head>
        ...
        <script src="https://unpkg.com/auscashaddrjs/dist/cashaddrjs.min.js"></script>
    </head>
    ...
</html>
```

#### jsFiddle

https://jsfiddle.net/zghd6c2y/

#### Change Log

-   1.1.0 - Support decoding prefixless addresses\
-   1.1.1 - Updated README to point to Bitcoin ABC monorepo\
-   1.1.2 - Updated `repository` field in `package.json` to Bitcoin ABC monorepo\
-   1.1.3 - Support string input and output for `hash`\
-   1.2.0 - Support lowercase input and output of address types, support encoding outputScript to address, support getting type and hash from an outputScript with new exported function `getTypeAndHashFromOutputScript`\
-   1.3.0 - Add `toLegacy` function to convert cashaddress format to legacy address\
-   1.4.0 - Add `isValidCashAddress` function to validate cash addresses by prefix\
-   1.4.1-6 - Fix repo README link for npmjs page\
-   1.5.0 - Add `getOutputScriptFromAddress` function to get outputScript from address
-   1.5.1 - Patch `getTypeAndHashFromOutputScript` to return type in lowercase (how chronik accepts it)
-   1.5.2 - Make input of address type case insensitive for `encode`, e.g. `p2pkh` and `P2PKH` both work
-   1.5.3 - Upgraded dependencies
-   1.5.4 - Added unit tests
-   1.5.5 - Skipped due to error in [D15400](https://reviews.bitcoinabc.org/D15400)
-   1.5.6 - Add types declaration for easy import by typescript apps
-   1.5.7 - Fix `isValidCashAddress` to allow both `undefined` or explicit `false` for no prefixes, or a user passed string as prefix
-   1.5.8 - Upgrading dependencies [D16376](https://reviews.bitcoinabc.org/D16376)
-   1.6.0 - Implement typescript [D16744](https://reviews.bitcoinabc.org/D16744)
-   1.6.1 - Replace `Buffer` with `Uint8Array` and stop using `webpack` to build [D17170](https://reviews.bitcoinabc.org/D17170)
-   1.6.2 - Lint to monorepo standards [D17183](https://reviews.bitcoinabc.org/D17183)
