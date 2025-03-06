/**
 * @license
 * https://reviews.bitcoinabc.org
 * Copyright (c) 2017-2020 Emilio Almansi
 * Copyright (c) 2023-2024 Bitcoin ABC
 * Distributed under the MIT software license, see the accompanying
 * file LICENSE or http://www.opensource.org/licenses/mit-license.php.
 */

import base32 from './base32';
import convertBits from './convertBits';
import { AddressType, DecodedAddress, TypeAndHash } from './types';
import bigInt, { BigInteger } from 'big-integer';
import bs58check from 'bs58check';
import validation from './validation';
const { validate, ValidationError } = validation;

/**
 * Encoding and decoding of the new Cash Address format for ausCash. <br />
 * Compliant with the original cashaddr specification:
 * {@link https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/cashaddr.md}
 * @module cashaddr
 */

/**
 * Encodes a hash from a given type into an ausCash address with the given prefix.
 *
 * @param prefix Cash address prefix. E.g.: 'auscash'.
 * @param type Type of address to generate
 * @param hash Hash to encode represented as an array of 8-bit integers.
 * @throws {ValidationError}
 */
function encode(
    prefix: string,
    type: AddressType,
    hash: Uint8Array | string,
): string {
    validate(
        typeof prefix === 'string' && isValidPrefix(prefix),
        'Invalid prefix: ' + prefix + '.',
    );
    validate(typeof type === 'string', 'Invalid type: ' + type + '.');
    validate(
        hash instanceof Uint8Array || typeof hash === 'string',
        'Invalid hash: ' + hash + '. Must be string or Uint8Array.',
    );
    if (typeof hash === 'string') {
        hash = stringToUint8Array(hash);
    }
    const prefixData = concat(prefixToUint5Array(prefix), new Uint8Array(1));
    const versionByte = getTypeBits(type) + getHashSizeBits(hash);
    const payloadData = toUint5Array(
        concat(new Uint8Array([versionByte]), hash),
    );
    const checksumData = concat(
        concat(prefixData, payloadData),
        new Uint8Array(8),
    );
    const payload = concat(
        payloadData,
        checksumToUint5Array(polymod(checksumData)),
    );
    return prefix + ':' + base32.encode(payload);
}

/**
 * Decodes the given address into its constituting prefix, type and hash. See [#encode()]{@link encode}.
 *
 * @param address Address to decode. E.g.: 'auscash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2'.
 * @param chronikReady Return hash160 as a string, and return type as lowercase. Inputs expected by chronik.
 * @throws {ValidationError}
 */
function decode(address: string, chronikReady = false): DecodedAddress {
    validate(
        typeof address === 'string' && hasSingleCase(address),
        'Invalid address: ' + address + '.',
    );
    const pieces = address.toLowerCase().split(':');
    // if there is no prefix, it might still be valid
    let prefix, payload;
    if (pieces.length === 1) {
        // Check and see if it has a valid checksum for accepted prefixes
        let hasValidChecksum = false;
        for (let i = 0; i < VALID_PREFIXES.length; i += 1) {
            const testedPrefix = VALID_PREFIXES[i];
            const prefixlessPayload = base32.decode(pieces[0]);
            hasValidChecksum = validChecksum(testedPrefix, prefixlessPayload);
            if (hasValidChecksum) {
                // Here's your prefix
                prefix = testedPrefix;
                payload = prefixlessPayload;
                // Stop testing other prefixes
                break;
            }
        }
        validate(
            hasValidChecksum,
            `Prefixless address ${address} does not have valid checksum for any valid prefix (${VALID_PREFIXES.join(
                ', ',
            )})`,
        );
    } else {
        validate(pieces.length === 2, 'Invalid address: ' + address + '.');
        prefix = pieces[0];
        payload = base32.decode(pieces[1]);
        validate(
            validChecksum(prefix, payload),
            'Invalid checksum: ' + address + '.',
        );
    }

    // We assert that payload will be defined here, as we validate above
    const payloadData = fromUint5Array((payload as Uint8Array).subarray(0, -8));
    const versionByte = payloadData[0];
    const hash = payloadData.subarray(1);
    validate(
        getHashSize(versionByte) === hash.length * 8,
        'Invalid hash size: ' + address + '.',
    );
    const type = getType(versionByte);
    return {
        prefix: prefix as string,
        type: chronikReady ? (type.toLowerCase() as AddressType) : type,
        hash: chronikReady ? uint8arrayToHexString(hash) : hash,
    };
}

/**
 * All valid address prefixes.
 *
 * @private
 */
const VALID_PREFIXES = [
    'auscash',
    'bitcoincash',
    'simpleledger',
    'etoken',
    'ectest',
    'ecregtest',
    'bchtest',
    'bchreg',
];

/**
 * Valid mainnet prefixes
 *
 * @private
 */
const VALID_PREFIXES_MAINNET = [
    'auscash',
    'bitcoincash',
    'simpleledger',
    'etoken',
];

/**
 * Checks whether a string is a valid prefix; ie., it has a single letter case
 * and is one of 'auscash', 'ectest', 'etoken', etc
 *
 * @private
 * @param prefix
 */
function isValidPrefix(prefix: string): boolean {
    return (
        hasSingleCase(prefix) &&
        VALID_PREFIXES.indexOf(prefix.toLowerCase()) !== -1
    );
}

/**
 * Derives an array from the given prefix to be used in the computation
 * of the address' checksum.
 *
 * @private
 * @param prefix Cash address prefix. E.g.: 'auscash'.
 */
function prefixToUint5Array(prefix: string): Uint8Array {
    const result = new Uint8Array(prefix.length);
    for (let i = 0; i < prefix.length; ++i) {
        result[i] = prefix[i].charCodeAt(0) & 31;
    }
    return result;
}

/**
 * Returns an array representation of the given checksum to be encoded
 * within the address' payload.
 *
 * @private
 * @param checksum Computed checksum.
 * TODO update big-integer so we can use correct types
 */
function checksumToUint5Array(checksum: BigInteger): Uint8Array {
    const result = new Uint8Array(8);
    for (let i = 0; i < 8; ++i) {
        result[7 - i] = checksum.and(31).toJSNumber();
        checksum = checksum.shiftRight(5);
    }
    return result;
}

/**
 * Returns the bit representation of the given type within the version
 * byte.
 *
 * @private
 * @param type Address type. Either 'P2PKH' or 'P2SH'.
 * @throws {ValidationError}
 */
function getTypeBits(type: AddressType): number {
    switch (type) {
        case 'p2pkh':
        case 'P2PKH':
            return 0;
        case 'p2sh':
        case 'P2SH':
            return 8;
        default:
            throw new ValidationError('Invalid type: ' + type + '.');
    }
}

/**
 * Retrieves the address type from its bit representation within the
 * version byte.
 *
 * @private
 * @param versionByte
 */
function getType(versionByte: number): AddressType {
    switch (versionByte & 120) {
        case 0:
            return 'P2PKH';
        case 8:
            return 'P2SH';
        default:
            throw new ValidationError(
                'Invalid address type in version byte: ' + versionByte + '.',
            );
    }
}

/**
 * Returns the bit representation of the length in bits of the given
 * hash within the version byte.
 *
 * @private
 * @param hash Hash to encode represented as an array of 8-bit integers.
 * @throws {ValidationError}
 */
function getHashSizeBits(hash: Uint8Array): number {
    switch (hash.length * 8) {
        case 160:
            return 0;
        case 192:
            return 1;
        case 224:
            return 2;
        case 256:
            return 3;
        case 320:
            return 4;
        case 384:
            return 5;
        case 448:
            return 6;
        case 512:
            return 7;
        default:
            throw new ValidationError(
                'Invalid hash size: ' + hash.length + '.',
            );
    }
}

/**
 * Retrieves the the length in bits of the encoded hash from its bit
 * representation within the version byte.
 *
 * @private
 * @param versionByte
 */
function getHashSize(versionByte: number): number {
    switch (versionByte & 7) {
        case 0:
            return 160;
        case 1:
            return 192;
        case 2:
            return 224;
        case 3:
            return 256;
        case 4:
            return 320;
        case 5:
            return 384;
        case 6:
            return 448;
        case 7:
            return 512;
        default:
            throw new Error('Invalid input');
    }
}

/**
 * Converts an array of 8-bit integers into an array of 5-bit integers,
 * right-padding with zeroes if necessary.
 *
 * @private
 * @param {Uint8Array} data
 */
function toUint5Array(data: Uint8Array): Uint8Array {
    return convertBits(data, 8, 5);
}

/**
 * Converts an array of 5-bit integers back into an array of 8-bit integers,
 * removing extra zeroes left from padding if necessary.
 * Throws a {@link ValidationError} if input is not a zero-padded array of 8-bit integers.
 *
 * @private
 * @param data
 * @throws {ValidationError}
 */
function fromUint5Array(data: Uint8Array): Uint8Array {
    return convertBits(data, 5, 8, true);
}

/**
 * Returns the concatenation a and b.
 *
 * @private
 * @param a
 * @param b
 * @throws {ValidationError}
 */
function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
    const ab = new Uint8Array(a.length + b.length);
    ab.set(a);
    ab.set(b, a.length);
    return ab;
}

/**
 * Computes a checksum from the given input data as specified for the CashAddr
 * format: https://github.com/Bitcoin-UAHF/spec/blob/master/cashaddr.md.
 *
 * @private
 * @param data Array of 5-bit integers over which the checksum is to be computed.
 */
function polymod(data: Uint8Array): BigInteger {
    const GENERATOR = [
        0x98f2bc8e61, 0x79b76d99e2, 0xf33e5fb3c4, 0xae2eabe2a8, 0x1e4f43e470,
    ];
    let checksum = bigInt(1);
    for (let i = 0; i < data.length; ++i) {
        const value = data[i];
        const topBits = checksum.shiftRight(35);
        checksum = checksum.and(0x07ffffffff).shiftLeft(5).xor(value);
        for (let j = 0; j < GENERATOR.length; ++j) {
            if (topBits.shiftRight(j).and(1).equals(1)) {
                checksum = checksum.xor(GENERATOR[j]);
            }
        }
    }
    return checksum.xor(1);
}

/**
 * Verify that the payload has not been corrupted by checking that the
 * checksum is valid.
 *
 * @private
 * @param prefix Cash address prefix. E.g.: 'auscash'.
 * @param payload Array of 5-bit integers containing the address' payload.
 */
function validChecksum(prefix: string, payload: Uint8Array): boolean {
    const prefixData = concat(prefixToUint5Array(prefix), new Uint8Array(1));
    const checksumData = concat(prefixData, payload);
    return polymod(checksumData).equals(0);
}

/**
 * Returns true if, and only if, the given string contains either uppercase
 * or lowercase letters, but not both.
 *
 * @private
 * @param string Input string.
 */
function hasSingleCase(string: string): boolean {
    return string === string.toLowerCase() || string === string.toUpperCase();
}

/**
 * Returns a uint8array for a given string input
 *
 * @private
 * @param string Input string.
 */
function stringToUint8Array(string: string): Uint8Array {
    const array = new Uint8Array(string.length / 2);
    for (let i = 0; i < string.length; i += 2) {
        // Convert each pair of characters to an integer
        array[i / 2] = parseInt(string.slice(i, i + 2), 16);
    }
    return array;
}

/**
 * Returns a uint8array for a given string input
 *
 * @private
 * @param uint8Array Input string.
 */
function uint8arrayToHexString(uint8Array: Uint8Array): string {
    let hexString = '';
    for (let i = 0; i < uint8Array.length; i++) {
        let hex = uint8Array[i].toString(16);
        // Ensure we have 2 digits for each byte
        hex = hex.length === 1 ? '0' + hex : hex;
        hexString += hex;
    }
    return hexString;
}

/**
 * Get type and hash from an outputScript
 *
 * Supported outputScripts:
 *
 * P2PKH: 76a914<hash>88ac
 * P2SH:  a914<hash>87
 *
 * Validates for supported outputScript and hash length *
 *
 * @param outputScript an auscash tx outputScript
 * @throws {ValidationError}
 */
function getTypeAndHashFromOutputScript(outputScript: string): TypeAndHash {
    const p2pkhPrefix = '76a914';
    const p2pkhSuffix = '88ac';

    const p2shPrefix = 'a914';
    const p2shSuffix = '87';

    let hash, type: AddressType;

    // If outputScript begins with '76a914' and ends with '88ac'
    if (
        outputScript.slice(0, p2pkhPrefix.length) === p2pkhPrefix &&
        outputScript.slice(-1 * p2pkhSuffix.length) === p2pkhSuffix
    ) {
        // We have type p2pkh
        type = 'p2pkh';

        // hash is the string in between '76a194' and '88ac'
        hash = outputScript.substring(
            outputScript.indexOf(p2pkhPrefix) + p2pkhPrefix.length,
            outputScript.lastIndexOf(p2pkhSuffix),
        );
        // If outputScript begins with 'a914' and ends with '87'
    } else if (
        outputScript.slice(0, p2shPrefix.length) === p2shPrefix &&
        outputScript.slice(-1 * p2shSuffix.length) === p2shSuffix
    ) {
        // We have type p2sh
        type = 'p2sh';
        // hash is the string in between 'a914' and '87'
        hash = outputScript.substring(
            outputScript.indexOf(p2shPrefix) + p2shPrefix.length,
            outputScript.lastIndexOf(p2shSuffix),
        );
    } else {
        // Throw validation error if outputScript not of these two types
        throw new ValidationError('Unsupported outputScript: ' + outputScript);
    }

    // Throw validation error if hash is of invalid size
    // Per spec, valid hash sizes in bytes
    const VALID_SIZES = [20, 24, 28, 32, 40, 48, 56, 64];

    if (!VALID_SIZES.includes(hash.length / 2)) {
        throw new ValidationError(
            'Invalid hash size in outputScript: ' + outputScript,
        );
    }
    return { type, hash };
}

/**
 * Encodes a given outputScript into an ausCash address using the optionally specified prefix.
 *
 * @static
 * @param outputScript an auscash tx outputScript
 * @param prefix Cash address prefix. E.g.: 'auscash'.
 * @throws {ValidationError}
 */
function encodeOutputScript(outputScript: string, prefix = 'auscash'): string {
    // Get type and hash from outputScript
    const { type, hash } = getTypeAndHashFromOutputScript(outputScript);

    // The encode function validates hash for correct length
    return encode(prefix, type, hash);
}

/**
 * Converts an auscash address to legacy format
 *
 * @static
 * @param  cashaddress a valid p2pkh or p2sh auscash address
 * @throws {ValidationError}
 */
function toLegacy(cashaddress: string): string {
    const { prefix, type, hash } = decode(cashaddress);
    const isMainnet = VALID_PREFIXES_MAINNET.includes(prefix);

    // Get correct version byte for legacy format
    let versionByte: number;
    switch (type) {
        case 'P2PKH':
            versionByte = isMainnet ? 0 : 111;
            break;
        case 'P2SH':
            versionByte = isMainnet ? 5 : 196;
            break;
        default:
            throw new ValidationError('Unsupported address type: ' + type);
    }

    // Create a new Uint8Array to hold the data
    const uint8Array = new Uint8Array(1 + hash.length);

    // Set the version byte
    uint8Array[0] = versionByte;

    // Set the hash
    uint8Array.set(hash as Uint8Array, 1);

    // Encode to base58check without using Buffer
    return bs58check.encode(uint8Array);
}

/**
 * Return true for a valid cashaddress
 * Prefixless addresses with valid checksum are also valid
 *
 * @static
 * @param testedAddress a string tested for cashaddress validity
 * @param optionalPrefix cashaddr prefix
 * @throws {ValidationError}
 */
function isValidCashAddress(
    cashaddress: string,
    optionalPrefix: boolean | string = false,
): boolean {
    try {
        const { prefix } = decode(cashaddress);
        if (optionalPrefix) {
            return prefix === optionalPrefix;
        }
        return true;
    } catch {
        return false;
    }
}

/**
 * Return true for a valid cashaddress
 * Prefixless addresses with valid checksum are also valid
 *
 * @static
 * @param address a valid p2pkh or p2sh cash address
 * @returns the outputScript associated with this address and type
 * @throws {ValidationError} if decode fails
 */
function getOutputScriptFromAddress(address: string): string {
    const { type, hash } = decode(address, true);
    let registrationOutputScript;
    if (type === 'p2pkh') {
        registrationOutputScript = `76a914${hash}88ac`;
    } else {
        registrationOutputScript = `a914${hash}87`;
    }
    return registrationOutputScript;
}

const cashaddr = {
    encode: encode,
    decode: decode,
    uint8arrayToHexString: uint8arrayToHexString,
    encodeOutputScript: encodeOutputScript,
    getTypeAndHashFromOutputScript: getTypeAndHashFromOutputScript,
    toLegacy: toLegacy,
    isValidCashAddress: isValidCashAddress,
    getOutputScriptFromAddress: getOutputScriptFromAddress,
};

// Note: we use this kind of strange export = cashaddr syntax to preserve existing import syntax
// i.e. we want to continue supporting apps that use
// const cashaddr = require('auscashaddrjs');

export = cashaddr;
