'use strict';
const config = require('../config');
const log = require('./log');
const { getAliasTxs, getValidAliasRegistrations } = require('./alias');
const { getUnprocessedTxHistory, getAllTxHistory } = require('./chronik');
const {
    getValidAliasTxsToBeAddedToDb,
    getConfirmedTxsToBeAddedToDb,
    getAliasBytecount,
    removeUnconfirmedTxsFromTxHistory,
} = require('./utils');
const { returnTelegramBotSendMessagePromise } = require('./telegram');
const { chronik } = require('./chronik');
const axios = require('axios');

module.exports = {
    initializeWebsocket: async function (db) {
        // Subscribe to chronik websocket
        const ws = chronik.ws({
            onMessage: async msg => {
                await module.exports.parseWebsocketMessage(db, msg);
            },
        });
        // Wait for WS to be connected:
        await ws.waitForOpen();
        log(`Connected to websocket`);
        // Subscribe to scripts (on Lotus, current ABC payout address):
        // Will give a message on avg every 2 minutes
        ws.subscribe('p2pkh', config.aliasConstants.registrationHash160);
        return ws;
    },
    parseWebsocketMessage: async function (
        db,
        wsMsg = { type: 'BlockConnected' },
    ) {
        log(`parseWebsocketMessage called on`, wsMsg);
        // Determine type of tx
        const { type } = wsMsg;
        log(`msg type: ${type}`);
        // type can be AddedToMempool, BlockConnected, or Confirmed
        // For now, we are only interested in "Confirmed", as only these are valid
        // We will want to look at AddedToMempool to process pending alias registrations later
        switch (type) {
            case 'BlockConnected': {
                typeof wsMsg.blockHash !== 'undefined'
                    ? log(`New block found: ${wsMsg.blockHash}`)
                    : log(`Checking for new aliases on startup`);

                // Get the valid aliases already in the db
                let validAliasesInDb;
                try {
                    validAliasesInDb = await db
                        .collection(config.database.collections.validAliases)
                        .find()
                        .sort({ blockheight: 1 })
                        .project({ _id: 0 })
                        .toArray();
                    log(`${validAliasesInDb.length} valid aliases in database`);
                } catch (error) {
                    log(`Error in determining validAliasesInDb`, error);
                }

                let mostRecentAlias;
                let processedBlockheight;
                // If you have aliases in the db, determine the most recently processed block
                if (validAliasesInDb && validAliasesInDb.length > 0) {
                    // The alias with the highest blockheight will be the last element
                    mostRecentAlias =
                        validAliasesInDb[validAliasesInDb.length - 1];

                    processedBlockheight = mostRecentAlias.blockheight;
                } else {
                    // If nothing is in cache, get the full tx history
                    processedBlockheight = 0;
                }

                log(`processedBlockheight: ${processedBlockheight}`);

                // Get confirmedTxHistory already in db
                let confirmedTxHistoryInDb;
                try {
                    confirmedTxHistoryInDb = await db
                        .collection(
                            config.database.collections.confirmedTxHistory,
                        )
                        .find()
                        .sort({ blockheight: 1 })
                        .project({ _id: 0 })
                        .toArray();
                    log(
                        `Fetched ${confirmedTxHistoryInDb.length} confirmed transactions at alias registration address from database`,
                    );
                } catch (error) {
                    log(`Error in determining confirmedTxHistoryInDb`, error);

                    log(`Assuming no cached tx history`);
                    confirmedTxHistoryInDb = [];
                }

                // Determine the number of transactions you have seen
                const processedTxCount =
                    confirmedTxHistoryInDb && confirmedTxHistoryInDb.length
                        ? confirmedTxHistoryInDb.length
                        : 0;

                log(`processedTxCount`, processedTxCount);

                const unprocessedTxs = await getUnprocessedTxHistory(
                    config.aliasConstants.registrationHash160,
                    processedBlockheight,
                    processedTxCount,
                );

                // Debug logging for unprocessed txs

                log(`${unprocessedTxs.length} unprocessed transactions`);
                for (let i = 0; i < unprocessedTxs.length; i += 1) {
                    log(`Unprocessed tx: ${unprocessedTxs[i].txid}`);
                }

                const aliasTxHistory = await getAllTxHistory(
                    config.aliasConstants.registrationHash160,
                );

                // Update your database cache of confirmed txs at the alias registration address

                // First, remove any unconfired txs from your tx history
                const confirmedAliasTxHistory =
                    removeUnconfirmedTxsFromTxHistory(aliasTxHistory);

                // Compare this result with your previously cached confirmed tx history
                const confirmedTxsToBeAddedToDb = getConfirmedTxsToBeAddedToDb(
                    confirmedTxHistoryInDb,
                    confirmedAliasTxHistory,
                );

                if (confirmedTxsToBeAddedToDb.length > 0) {
                    log(
                        `Adding ${confirmedTxsToBeAddedToDb.length} confirmed txs to the db`,
                    );
                    // add them
                    // Update with real data
                    try {
                        const confirmedTxHistoryCollectionInsertResult =
                            await db
                                .collection(
                                    config.database.collections
                                        .confirmedTxHistory,
                                )
                                .insertMany(confirmedTxsToBeAddedToDb);
                        log(
                            `Inserted ${confirmedTxHistoryCollectionInsertResult.insertedCount} confirmed txs into ${config.database.collections.confirmedTxHistory}`,
                        );
                    } catch (err) {
                        log(
                            `A MongoBulkWriteException occurred adding confirmedTxsToBeAddedToDb to the db, but there are successfully processed documents.`,
                        );
                        /*
                        let ids = err.result.result.insertedIds;
                        for (let id of Object.values(ids)) {
                            log(`Processed a document with id ${id._id}`);
                        }
                        */
                        log(
                            `Number of documents inserted: ${err.result.result.nInserted}`,
                        );
                        log(`Error:`, err);
                    }
                } else {
                    log(`No new confirmed alias txs since last block`);
                }

                const allAliasTxs = getAliasTxs(
                    aliasTxHistory,
                    config.aliasConstants,
                );
                const validAliasRegistrations =
                    getValidAliasRegistrations(allAliasTxs);
                log(
                    `${validAliasRegistrations.length} valid alias registrations`,
                );

                const validAliasTxsToBeAddedToDb =
                    getValidAliasTxsToBeAddedToDb(
                        validAliasesInDb,
                        validAliasRegistrations,
                    );
                log(`validAliasTxsToBeAddedToDb`, validAliasTxsToBeAddedToDb);

                if (validAliasTxsToBeAddedToDb.length > 0) {
                    // Update with real data
                    try {
                        const validAliasTxsCollectionInsertResult = await db
                            .collection(
                                config.database.collections.validAliases,
                            )
                            .insertMany(validAliasTxsToBeAddedToDb);
                        log(
                            `Inserted ${validAliasTxsCollectionInsertResult.insertedCount} aliases into ${config.database.collections.validAliases}`,
                        );
                    } catch (err) {
                        log(
                            `A MongoBulkWriteException occurred adding validAliasRegistrations to the db, but there are successfully processed documents.`,
                        );
                        /*
                        let ids = err.result.result.insertedIds;
                        for (let id of Object.values(ids)) {
                            log(`Processed a document with id ${id._id}`);
                        }
                        */
                        log(
                            `Number of documents inserted: ${err.result.result.nInserted}`,
                        );
                        log(`Error:`, err);
                    }

                    // Get the XEC price to use in the Telegram msgs
                    let coingeckoPriceResponse;
                    let xecPrice;
                    try {
                        coingeckoPriceResponse = await axios.get(
                            `https://api.coingecko.com/api/v3/simple/price?ids=ecash&vs_currencies=usd`,
                        );
                        xecPrice = coingeckoPriceResponse.data.ecash.usd;
                        log(`xecPrice`, xecPrice);
                    } catch (err) {
                        log(`Error getting XEC price from Coingecko API`, err);
                        xecPrice = false;
                    }

                    // Send msgs to Telegram channel about newly registered aliases
                    const tgBotMsgPromises = [];
                    for (
                        let i = 0;
                        i < validAliasTxsToBeAddedToDb.length;
                        i += 1
                    ) {
                        // Get interesting info for a telegram message
                        const { alias, address, txid } =
                            validAliasTxsToBeAddedToDb[i];

                        // Get alias byte count
                        const aliasBytecount = getAliasBytecount(alias);

                        const aliasPriceSats =
                            config.aliasConstants.registrationFeesSats[
                                aliasBytecount
                            ];
                        // Construct your Telegram message in markdown
                        const tgMsg =
                            `A new ${aliasBytecount}-byte alias has been registered for ` +
                            (xecPrice
                                ? `$${(
                                      (aliasPriceSats / 100) *
                                      xecPrice
                                  ).toLocaleString('en-US', {
                                      maximumFractionDigits: 2,
                                  })} USD`
                                : `${(
                                      aliasPriceSats / 100
                                  ).toLocaleString()} XEC`) +
                            `!\n` +
                            `\n` +
                            `"${alias}"\n` +
                            `\n` +
                            `[address](${config.blockExplorer}/address/${address}) | [tx](${config.blockExplorer}/tx/${txid})`;
                        // Configure msg parse settings
                        let tgMsgOptions = {
                            parse_mode: 'markdown',
                            disable_web_page_preview: true,
                        };
                        const tgBotMsgPromise =
                            returnTelegramBotSendMessagePromise(
                                tgMsg,
                                tgMsgOptions,
                            );
                        tgBotMsgPromises.push(tgBotMsgPromise);
                    }
                    /* 
                    Send msgs in a batch to handle nodejs async threads
                    Note: you will still run into rate limit issues if 
                    you are trying to send more than 25 msgs at once
                    */
                    try {
                        await Promise.all(tgBotMsgPromises);
                        log(
                            `Successfully sent ${tgBotMsgPromises.length} messages to channel`,
                        );
                    } catch (err) {
                        log(
                            `Error sending Telegram Bot message for aliases`,
                            err,
                        );
                    }
                }
                break;
            }
            case 'AddedToMempool':
                log(`New tx: ${wsMsg.txid}`);
                break;
            case 'Confirmed':
                log(`New confirmed tx: ${wsMsg.txid}`);
                break;
            default:
                log(`New websocket message of unknown type:`, wsMsg);
        }
    },
};
