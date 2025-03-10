// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { opReturn as opreturnConfig } from 'config/opreturn';
import { chronik as chronikConfig } from 'config/chronik';
import { getStackArray } from 'auscash-script';
import cashaddr from 'auscashaddrjs';
import {
    getHashes,
    decimalizeTokenAmount,
    undecimalizeTokenAmount,
    CashtabUtxo,
    CashtabWallet,
    TokenUtxo,
    NonTokenUtxo,
    SlpDecimals,
    CashtabTx,
} from 'wallet';
import {
    ChronikClient,
    TxHistoryPage,
    ScriptUtxo,
    Tx,
    BlockMetadata,
} from 'chronik-client';
import { CashtabCachedTokenInfo } from 'config/CashtabCache';

const CHRONIK_MAX_PAGE_SIZE = 200;

export const getTxHistoryPage = async (
    chronik: ChronikClient,
    hash160: string,
    page = 0,
): Promise<void | TxHistoryPage> => {
    let txHistoryPage;
    try {
        txHistoryPage = await chronik
            .script('p2pkh', hash160)
            // Get the 25 most recent transactions
            .history(page, chronikConfig.txHistoryPageSize);
        return txHistoryPage;
    } catch (err) {
        console.error(`Error in getTxHistoryPage(${hash160})`, err);
    }
};

export const returnGetTxHistoryPagePromise = (
    chronik: ChronikClient,
    hash160: string,
    page = 0,
): Promise<TxHistoryPage> => {
    /* 
    Unlike getTxHistoryPage, this function will reject and 
    fail Promise.all() if there is an error in the chronik call
    */
    return new Promise((resolve, reject) => {
        chronik
            .script('p2pkh', hash160)
            .history(page, chronikConfig.txHistoryPageSize)
            .then(
                result => {
                    resolve(result);
                },
                err => {
                    reject(err);
                },
            );
    });
};

interface Alias {
    alias: string;
}
export const isAliasRegistered = (
    registeredAliases: Alias[],
    alias: string,
): boolean => {
    for (let i = 0; i < registeredAliases.length; i++) {
        if (
            registeredAliases[i].alias.toString().toLowerCase() ===
            alias.toLowerCase()
        ) {
            console.error(`Alias (${alias}) is registered`);
            return true;
        }
    }
    return false;
};

/**
 * Return a promise to fetch all utxos at an address (and add a 'path' key to them)
 * We need the path key so that we know which wif to sign this utxo with
 * If we add HD wallet support, we will need to add an address key, and change the structure of wallet.paths
 * @param chronik
 * @paramaddress
 * @param path
 */
export const returnGetPathedUtxosPromise = (
    chronik: ChronikClient,
    address: string,
    path: number,
): Promise<CashtabUtxo[]> => {
    return new Promise((resolve, reject) => {
        chronik
            .address(address)
            .utxos()
            .then(
                result => {
                    const cashtabUtxos: CashtabUtxo[] = result.utxos.map(
                        (utxo: ScriptUtxo) => ({
                            ...utxo,
                            path: path,
                        }),
                    );
                    resolve(cashtabUtxos);
                },
                err => {
                    reject(err);
                },
            );
    });
};

/**
 * Get all utxos for a given wallet
 * @param chronik
 * @param wallet a cashtab wallet
 * @returns
 */
export const getUtxos = async (
    chronik: ChronikClient,
    wallet: CashtabWallet,
): Promise<CashtabUtxo[]> => {
    const chronikUtxoPromises: Promise<CashtabUtxo[]>[] = [];
    wallet.paths.forEach((pathInfo, path) => {
        const thisPromise = returnGetPathedUtxosPromise(
            chronik,
            pathInfo.address,
            path,
        );
        chronikUtxoPromises.push(thisPromise);
    });
    const utxoResponsesByPath = await Promise.all(chronikUtxoPromises);
    const flatUtxos = utxoResponsesByPath.flat();
    return flatUtxos;
};

interface OrganizedUtxos {
    slpUtxos: TokenUtxo[];
    nonSlpUtxos: NonTokenUtxo[];
}
/**
 * Organize utxos by token and non-token
 * TODO deprecate this and use better coinselect methods
 * @param chronikUtxos
 */
export const organizeUtxosByType = (
    chronikUtxos: CashtabUtxo[],
): OrganizedUtxos => {
    const nonSlpUtxos = [];
    const slpUtxos = [];
    for (const utxo of chronikUtxos) {
        // Construct nonSlpUtxos and slpUtxos arrays
        if (typeof utxo.token !== 'undefined') {
            slpUtxos.push(utxo as TokenUtxo);
        } else {
            nonSlpUtxos.push(utxo as NonTokenUtxo);
        }
    }

    return { slpUtxos, nonSlpUtxos };
};

/**
 * Get just the tx objects from chronik history() responses
 * @param txHistoryOfAllAddresses
 * @returns
 */
export const flattenChronikTxHistory = (
    txHistoryOfAllAddresses: TxHistoryPage[],
) => {
    let flatTxHistoryArray: Tx[] = [];
    for (const txHistoryThisAddress of txHistoryOfAllAddresses) {
        flatTxHistoryArray = flatTxHistoryArray.concat(
            txHistoryThisAddress.txs,
        );
    }
    return flatTxHistoryArray;
};

interface ConfirmedTx extends Omit<Tx, 'block'> {
    block: BlockMetadata;
}

/**
 * Sort an array of chronik txs chronologically and return the first renderedCount of them
 * @param txs
 * @param renderedCount how many txs to return
 * @returns
 */
export const sortAndTrimChronikTxHistory = (
    txs: Tx[],
    renderedCount: number,
): Tx[] => {
    const unconfirmedTxs = [];
    const confirmedTxs: ConfirmedTx[] = [];
    for (const tx of txs) {
        if (typeof tx.block === 'undefined') {
            unconfirmedTxs.push(tx);
        } else {
            confirmedTxs.push(tx as ConfirmedTx);
        }
    }

    // Sort confirmed txs by blockheight, and then timeFirstSeen
    const sortedConfirmedTxHistoryArray = confirmedTxs.sort(
        (a, b) =>
            // We want more recent blocks i.e. higher blockheights to have earlier array indices
            b.block.height - a.block.height ||
            // For blocks with the same height, we want more recent timeFirstSeen i.e. higher timeFirstSeen to have earlier array indices
            b.timeFirstSeen - a.timeFirstSeen,
    );

    // Sort unconfirmed txs by timeFirstSeen
    const sortedUnconfirmedTxHistoryArray = unconfirmedTxs.sort(
        (a, b) => b.timeFirstSeen - a.timeFirstSeen,
    );

    // The unconfirmed txs are more recent, so they should be inserted into an array before the confirmed txs
    const sortedChronikTxHistoryArray = sortedUnconfirmedTxHistoryArray.concat(
        sortedConfirmedTxHistoryArray,
    );

    const trimmedAndSortedChronikTxHistoryArray =
        sortedChronikTxHistoryArray.splice(0, renderedCount);

    return trimmedAndSortedChronikTxHistoryArray;
};

export enum XecTxType {
    Received = 'Received',
    Sent = 'Sent',
    Staking = 'Staking Reward',
    Coinbase = 'Coinbase Reward',
}
export interface ParsedTx {
    recipients: string[];
    satoshisSent: number;
    stackArray: string[];
    xecTxType: XecTxType;
}
/**
 * Parse a Tx object for rendering in Cashtab
 * TODO Potentially more efficient to do this calculation in the Tx.js component
 * @param tx
 * @param hashes array of wallet hashes, one for each path
 */
export const parseTx = (tx: Tx, hashes: string[]): ParsedTx => {
    const { inputs, outputs, isCoinbase } = tx;

    // Assign defaults
    let incoming = true;
    let stackArray = [];

    // If it is not an incoming tx, make an educated guess about what addresses were sent to
    const destinationAddresses: Set<string> = new Set();

    // Iterate over inputs to see if this is an incoming tx (incoming === true)
    for (const input of inputs) {
        for (const hash of hashes) {
            if (
                typeof input.outputScript !== 'undefined' &&
                input.outputScript.includes(hash)
            ) {
                // Then this is an outgoing tx
                // Note: if the outputs also only send to inputs, then it is actually an incoming "self-send" tx
                // For the purposes of rendering Cashtab tx history, self send txs are considered !incoming
                incoming = false;

                // Break out of this for loop once you know this is (probably) an outgoing tx
                break;
            }
        }
    }

    // Iterate over outputs to get the amount sent
    let change = 0;
    let outputSatoshis = 0;
    let receivedSatoshis = 0;
    // A selfSendTx only sends to outputs in the wallet
    let selfSendTx = true;
    for (const output of outputs) {
        const { outputScript, value } = output;
        // outputSatoshis will have the total satoshis of all outputs
        outputSatoshis += value;
        if (outputScript.startsWith(opreturnConfig.opReturnPrefixHex)) {
            // If this is an OP_RETURN output, get stackArray to store in parsed
            // Note: we are assuming the tx only has one OP_RETURN output
            // If it has more than one, then we will only parse the stackArray of the highest-index OP_RETURN
            // For now, there is no need to handle the edge case of multiple OP_RETURNS in tx parsing
            stackArray = getStackArray(outputScript);

            // Continue to the next output, we do not parse value for OP_RETURN outputs
            continue;
        }
        // Find amounts at your wallet's addresses
        let walletIncludesThisOutputScript = false;
        for (const hash of hashes) {
            if (outputScript.includes(hash)) {
                walletIncludesThisOutputScript = true;
                // If incoming tx, this is amount received by the user's wallet
                // if outgoing tx (incoming === false), then this is a change amount
                change += value;
                receivedSatoshis += value;
            }
        }
        if (!walletIncludesThisOutputScript) {
            // See if this output script is a p2pkh or p2sh auscash address
            try {
                const destinationAddress =
                    cashaddr.encodeOutputScript(outputScript);
                destinationAddresses.add(destinationAddress);
            } catch (err) {
                // Do not render non-address recipients in tx history
            }

            // If any output is at an outputScript that is not included in this wallet
            // Then it is not a self-send tx
            selfSendTx = false;
        }
    }
    const satoshisSent = selfSendTx
        ? outputSatoshis
        : isCoinbase
        ? change
        : incoming
        ? receivedSatoshis
        : outputSatoshis - change;

    let xecTxType = incoming ? XecTxType.Received : XecTxType.Sent;

    // Parse for tx label
    if (isCoinbase) {
        // Note, staking rewards activated at blockheight 818670
        // For now, we assume Cashtab is parsing txs after this height
        const STAKING_REWARDS_FACTOR = 0.1; // i.e. 10%
        // In practice, the staking reward will almost always be the one that is exactly 10% of totalCoinbaseSats
        // Use a STAKING_REWARDS_PADDING range to exclude miner and ifp outputs
        const STAKING_REWARDS_PADDING = 0.01;
        if (
            satoshisSent >=
                Math.floor(
                    (STAKING_REWARDS_FACTOR - STAKING_REWARDS_PADDING) *
                        outputSatoshis,
                ) &&
            satoshisSent <=
                Math.floor(
                    (STAKING_REWARDS_FACTOR + STAKING_REWARDS_PADDING) *
                        outputSatoshis,
                )
        ) {
            xecTxType = XecTxType.Staking;
        } else {
            // We do not specifically parse for IFP reward vs miner reward
            xecTxType = XecTxType.Coinbase;
        }
    }

    return {
        xecTxType,
        satoshisSent,
        stackArray,
        recipients: Array.from(destinationAddresses),
    };
};

/**
 * Get tx history of cashtab wallet
 * - Get tx history of each path in wallet
 * - sort by timeFirstSeen + block
 * - Trim to number of txs Cashtab renders
 * - Parse txs for rendering in Cashtab
 * - Update cachedTokens with any new tokenIds
 * @param chronik chronik-client instance
 * @param wallet cashtab wallet
 * @param cachedTokens the map stored at cashtabCache.tokens
 * @returns Tx[], each tx also has a 'parsed' key with other rendering info
 */
export const getHistory = async (
    chronik: ChronikClient,
    wallet: CashtabWallet,
    cachedTokens: Map<string, CashtabCachedTokenInfo>,
): Promise<CashtabTx[]> => {
    const txHistoryPromises: Promise<TxHistoryPage>[] = [];
    wallet.paths.forEach(pathInfo => {
        txHistoryPromises.push(chronik.address(pathInfo.address).history());
    });

    // Just throw an error if you get a chronik error
    // This will be handled in the update loop
    const txHistoryOfAllAddresses = await Promise.all(txHistoryPromises);

    const flatTxHistoryArray = flattenChronikTxHistory(txHistoryOfAllAddresses);
    const renderedTxs = sortAndTrimChronikTxHistory(
        flatTxHistoryArray,
        chronikConfig.txHistoryCount,
    );

    // Parse txs
    const history: CashtabTx[] = [];
    for (const tx of renderedTxs) {
        const { tokenEntries } = tx;

        // Get all tokenIds associated with this tx
        const tokenIds: Set<string> = new Set();
        for (const tokenEntry of tokenEntries) {
            tokenIds.add(tokenEntry.tokenId);
        }

        // Cache any tokenIds you do not have cached
        for (const tokenId of [...tokenIds]) {
            if (typeof cachedTokens.get(tokenId) === 'undefined') {
                // Add it to cache right here
                try {
                    const newTokenCacheInfo = await getTokenGenesisInfo(
                        chronik,
                        tokenId,
                    );
                    cachedTokens.set(tokenId, newTokenCacheInfo);
                } catch (err) {
                    // If you have an error getting the calculated token cache info, do not throw
                    // Could be some token out there that we do not parse properly with getTokenGenesisInfo
                    // Log it
                    // parseTx is tolerant to not having the info in cache
                    console.error(
                        `Error in getTokenGenesisInfo for tokenId ${tokenId}`,
                        err,
                    );
                }
            }
        }

        (tx as CashtabTx).parsed = parseTx(tx, getHashes(wallet));

        history.push(tx as CashtabTx);
    }

    return history;
};

/**
 * Get all info about a token used in Cashtab's token cache
 * @param chronik
 * @param tokenId
 */
export const getTokenGenesisInfo = async (
    chronik: ChronikClient,
    tokenId: string,
): Promise<CashtabCachedTokenInfo> => {
    // We can get timeFirstSeen, block, tokenType, and genesisInfo from the token() endpoint
    // If we call this endpoint before the genesis tx is confirmed, we will not get block
    // So, block does not need to be included

    const tokenInfo = await chronik.token(tokenId);
    const genesisTxInfo = await chronik.tx(tokenId);

    const { timeFirstSeen, genesisInfo, tokenType } = tokenInfo;
    const decimals = genesisInfo.decimals;

    // Initialize variables for determined quantities we want to cache

    /**
     * genesisSupply {string}
     * Quantity of token created at mint
     * Note: we may have genesisSupply at different genesisAddresses
     * We do not track this information, only total genesisSupply
     * Cached as a decimalized string, e.g. 0.000 if 0 with 3 decimal places
     * 1000.000000000 if one thousand with 9 decimal places
     */
    let genesisSupply = decimalizeTokenAmount('0', decimals as SlpDecimals);

    /**
     * genesisMintBatons {number}
     * Number of mint batons created in the genesis tx for this token
     */
    let genesisMintBatons = 0;

    /**
     * genesisOutputScripts {Set(<outputScript>)}
     * Address(es) where initial token supply was minted
     */
    const genesisOutputScripts: Set<string> = new Set();

    // Iterate over outputs
    for (const output of genesisTxInfo.outputs) {
        if (output.token?.tokenId === tokenId) {
            // If this output of this genesis tx is associated with this tokenId

            const { token, outputScript } = output;

            // Add its outputScript to genesisOutputScripts
            genesisOutputScripts.add(outputScript);

            const { isMintBaton, amount } = token;
            if (isMintBaton) {
                // If it is a mintBaton, increment genesisMintBatons
                genesisMintBatons += 1;
            }

            // Increment genesisSupply
            // decimalizeTokenAmount, undecimalizeTokenAmount
            //genesisSupply = genesisSupply.plus(new BN(amount));

            genesisSupply = decimalizeTokenAmount(
                (
                    BigInt(
                        undecimalizeTokenAmount(
                            genesisSupply,
                            decimals as SlpDecimals,
                        ),
                    ) + BigInt(amount)
                ).toString(),
                decimals as SlpDecimals,
            );
        }
    }

    const tokenCache: CashtabCachedTokenInfo = {
        tokenType,
        genesisInfo,
        timeFirstSeen,
        genesisSupply,
        // Return genesisOutputScripts as an array as we no longer require Set features
        genesisOutputScripts: [...genesisOutputScripts],
        genesisMintBatons,
    };
    if (typeof tokenInfo.block !== 'undefined') {
        // If the genesis tx is confirmed at the time we check
        tokenCache.block = tokenInfo.block;
    }

    if (tokenType.type === 'SLP_TOKEN_TYPE_NFT1_CHILD') {
        // If this is an SLP1 NFT
        // Get the groupTokenId
        // This is available from the .tx() call and will never change, so it should also be cached
        for (const tokenEntry of genesisTxInfo.tokenEntries) {
            const { txType } = tokenEntry;
            if (txType === 'GENESIS') {
                const { groupTokenId } = tokenEntry;
                tokenCache.groupTokenId = groupTokenId;
            }
        }
    }
    // Note: if it is not confirmed, we can update the cache later when we try to use this value

    return tokenCache;
};

/**
 * Get decimalized balance of every token held by a wallet
 * Update Cashtab's tokenCache if any tokens are uncached
 * @param chronik
 * @param slpUtxos array of token utxos from chronik
 * @param tokenCache Cashtab's token cache
 * @returns Map of tokenId => token balance as decimalized string
 * Also updates tokenCache
 */
export const getTokenBalances = async (
    chronik: ChronikClient,
    slpUtxos: TokenUtxo[],
    tokenCache: Map<string, CashtabCachedTokenInfo>,
): Promise<Map<string, string>> => {
    const walletStateTokens: Map<string, string> = new Map();
    for (const utxo of slpUtxos) {
        // Every utxo in slpUtxos will have a tokenId
        const { token } = utxo;
        const { tokenId, amount } = token;
        // Is this token cached?
        let cachedTokenInfo = tokenCache.get(tokenId);
        if (typeof cachedTokenInfo === 'undefined') {
            // If we have not cached this token before, cache it
            cachedTokenInfo = await getTokenGenesisInfo(chronik, tokenId);
            tokenCache.set(tokenId, cachedTokenInfo);
        }
        // Now decimals is available
        const decimals = cachedTokenInfo.genesisInfo.decimals;

        const tokenBalanceInMap = walletStateTokens.get(tokenId);

        // Update or initialize token balance as a decimalized string in walletStateTokens Map
        walletStateTokens.set(
            tokenId,
            typeof tokenBalanceInMap === 'undefined'
                ? decimalizeTokenAmount(amount, decimals as SlpDecimals)
                : decimalizeTokenAmount(
                      (
                          BigInt(
                              undecimalizeTokenAmount(
                                  tokenBalanceInMap,
                                  decimals as SlpDecimals,
                              ),
                          ) + BigInt(amount)
                      ).toString(),
                      decimals as SlpDecimals,
                  ),
        );
    }

    return walletStateTokens;
};

/**
 *
 * @param chronik
 * @param tokenId
 * @param pageSize usually 200, the chronik max, but accept a parameter to simplify unit testing
 * @returns
 */
export const getAllTxHistoryByTokenId = async (
    chronik: ChronikClient,
    tokenId: string,
    pageSize = CHRONIK_MAX_PAGE_SIZE,
): Promise<Tx[]> => {
    // We will throw an error if we get an error from chronik fetch
    const firstPageResponse = await chronik
        .tokenId(tokenId)
        // call with page=0 (to get first page) and max page size, as we want all the history
        .history(0, pageSize);
    const { txs, numPages } = firstPageResponse;
    // Get tx history from all pages
    // We start with i = 1 because we already have the data from page 0
    const tokenHistoryPromises = [];
    for (let i = 1; i < numPages; i += 1) {
        tokenHistoryPromises.push(
            new Promise<Tx[]>((resolve, reject) => {
                chronik
                    .tokenId(tokenId)
                    .history(i, CHRONIK_MAX_PAGE_SIZE)
                    .then(
                        result => {
                            resolve(result.txs);
                        },
                        err => {
                            reject(err);
                        },
                    );
            }),
        );
    }
    // Get rest of txHistory using Promise.all() to execute requests in parallel
    const restOfTxHistory = await Promise.all(tokenHistoryPromises);
    // Flatten so we have an array of tx objects, and not an array of arrays of tx objects
    const flatTxHistory = restOfTxHistory.flat();
    // Combine with the first page
    const allHistory = txs.concat(flatTxHistory);

    return allHistory;
};

/**
 * Get all child NFTs from a given parent tokenId
 * i.e. get all NFTs in an NFT collection *
 * @param parentTokenId
 * @param allParentTokenTxHistory
 */
export const getChildNftsFromParent = (
    parentTokenId: string,
    allParentTokenTxHistory: Tx[],
): string[] => {
    const childNftsFromThisParent = [];
    for (const tx of allParentTokenTxHistory) {
        // Check tokenEntries
        const { tokenEntries } = tx;
        for (const tokenEntry of tokenEntries) {
            const { txType } = tokenEntry;
            if (
                txType === 'GENESIS' &&
                typeof tokenEntry.groupTokenId !== 'undefined' &&
                tokenEntry.groupTokenId === parentTokenId
            ) {
                childNftsFromThisParent.push(tokenEntry.tokenId);
            }
        }
    }
    return childNftsFromThisParent;
};
