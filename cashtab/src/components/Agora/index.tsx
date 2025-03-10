// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import { WalletContext } from 'wallet/context';
import { SwitchLabel, Alert, PageHeader } from 'components/Common/Atoms';
import Spinner from 'components/Common/Spinner';
import { getTokenGenesisInfo } from 'chronik';
import { toHex } from 'auscash-lib';
import { ActiveOffers, OfferTitle, OfferTable } from './styled';
import { SwitchHolder } from 'components/Etokens/Token/styled';
import { getUserLocale } from 'helpers';
import appConfig from 'config/app';
import Switch from 'components/Common/Switch';
import OrderBook from './OrderBook';
import { token as tokenConfig } from 'config/token';
import CashtabCache, { CashtabCachedTokenInfo } from 'config/CashtabCache';
import { AusIcon } from 'components/Common/CustomIcons';

interface CashtabActiveOffers {
    offeredFungibleTokenIds: string[];
    offeredFungibleTokenIdsThisWallet: string[];
}

interface ServerBlacklistResponse {
    status: string;
    tokenIds: string[];
}

const Agora: React.FC = () => {
    const userLocale = getUserLocale(navigator);
    const ContextValue = React.useContext(WalletContext);
    const {
        ecc,
        fiatPrice,
        chronik,
        agora,
        cashtabState,
        updatausCashtabState,
        chaintipBlockheight,
    } = ContextValue;
    const { wallets, settings, cashtabCache } = cashtabState;
    const wallet = wallets.length > 0 ? wallets[0] : false;
    const pk =
        wallet === false ? null : wallet.paths.get(appConfig.derivationPath).pk;

    // active agora partial offers organized for rendering this screen
    const [activeOffersCashtab, setActiveOffersCashtab] =
        useState<null | CashtabActiveOffers>(null);
    const [chronikQueryError, setChronikQueryError] = useState<boolean>(false);
    const [manageMyOffers, setManageMyOffers] = useState<boolean>(false);

    /**
     * Specialized helper function to support use of Promise.all in adding new tokens to cache
     * While this functionality could be extended to other parts of Cashtab, for now it is
     * only necessary on this screen
     * As it is extended, this function should be generalized and refactored out of this screen
     * Leave it here for now as a model of how to do it. Ensuring the cache (local storage) is properly
     * updated with the state may need to be handled differently in a different component
     */
    const returnGetAndCacheTokenInfoPromise = (
        cashtabCache: CashtabCache,
        tokenId: string,
    ): Promise<void> => {
        return new Promise((resolve, reject) => {
            const tokenInfoPromise: Promise<CashtabCachedTokenInfo> =
                getTokenGenesisInfo(
                    chronik,
                    tokenId,
                ) as Promise<CashtabCachedTokenInfo>;
            tokenInfoPromise.then(
                result => {
                    cashtabCache.tokens.set(tokenId, result);
                    resolve();
                },
                err => {
                    reject(err);
                },
            );
        });
    };

    const getListedTokens = async () => {
        // 1. Get all offered tokens
        let offeredFungibleTokenIds: string[];
        try {
            offeredFungibleTokenIds = await agora.offeredFungibleTokenIds();
        } catch (err) {
            console.error(`Error getting agora.offeredFungibleTokenIds()`, err);
            return setChronikQueryError(true);
        }

        // Check which tokenIds we need to cache
        // Note that we get cache info for blacklisted tokenIds
        const tokenIdsWeNeedToCache = [];
        for (const tokenId of offeredFungibleTokenIds) {
            const isCached =
                typeof cashtabCache.tokens.get(tokenId) !== 'undefined';
            if (!isCached) {
                tokenIdsWeNeedToCache.push(tokenId);
            }
        }

        // Fetch server-maintained blacklist
        let blacklist: string[];
        try {
            const serverBlacklistResponse: ServerBlacklistResponse = await (
                await fetch(`${tokenConfig.blacklistServerUrl}/blacklist`)
            ).json();
            blacklist = serverBlacklistResponse.tokenIds;
            if (!Array.isArray(blacklist)) {
                throw new Error('Error parsing server response');
            }
        } catch (err) {
            console.error(
                `Error fetching blacklist from ${tokenConfig.blacklistServerUrl}`,
                err,
            );
            // Fall back to locally maintained blacklist
            blacklist = tokenConfig.blacklist;
        }

        // Filter offeredFungibleTokenIds for blacklisted tokens
        const noBlacklistedOfferedFungibleTokenIds =
            offeredFungibleTokenIds.filter(
                tokenId => !blacklist.includes(tokenId),
            );
        const activeBlacklistedOffers =
            offeredFungibleTokenIds.length -
            noBlacklistedOfferedFungibleTokenIds.length;
        console.info(
            `${activeBlacklistedOffers} blacklisted offer${
                activeBlacklistedOffers === 1 ? '' : 's'
            }`,
        );

        // 2. Get all offers listed from the active wallet
        let activeOffersByPubKey;
        let offeredFungibleTokenIdsThisWallet: Set<string> | string[] =
            new Set();
        try {
            activeOffersByPubKey = await agora.activeOffersByPubKey(toHex(pk));
            // Just get the tokenIds as the Orderbook will load and prepare the offers by tokenId
            for (const activeOffer of activeOffersByPubKey) {
                if (activeOffer.variant.type === 'PARTIAL') {
                    offeredFungibleTokenIdsThisWallet.add(
                        activeOffer.token.tokenId,
                    );
                }
            }
        } catch (err) {
            console.error(`Error getting agora.activeOffersByPubKey()`, err);
            return setChronikQueryError(true);
        }

        // Sort noBlacklistedOfferedFungibleTokenIds by tokenId
        // This keeps the order fixed for every user
        // TODO sort by trading volume
        noBlacklistedOfferedFungibleTokenIds.sort();
        offeredFungibleTokenIdsThisWallet = Array.from(
            offeredFungibleTokenIdsThisWallet,
        ).sort();

        setActiveOffersCashtab({
            offeredFungibleTokenIds: noBlacklistedOfferedFungibleTokenIds,
            offeredFungibleTokenIdsThisWallet:
                offeredFungibleTokenIdsThisWallet,
        });

        // Handy to check this in Cashtab
        console.info(
            `${noBlacklistedOfferedFungibleTokenIds.length} non-blacklisted tokens with active listings.`,
        );

        // Build an array of promises to get token info for all unknown tokens
        const tokenInfoPromises = [];
        for (const tokenId of Array.from(tokenIdsWeNeedToCache)) {
            tokenInfoPromises.push(
                returnGetAndCacheTokenInfoPromise(cashtabCache, tokenId),
            );
        }
        try {
            await Promise.all(tokenInfoPromises);
        } catch (err) {
            console.error(`Error in Promise.all(tokenInfoPromises)`, err);
            // Cache will not be updated, token names and IDs will show spinners
        }
        if (tokenInfoPromises.length > 0) {
            // If we had new tokens to cache, update the cache
            // This will replace the inline spinners with tokenIds
            // and also update cashtabCache in local storage
            updatausCashtabState('cashtabCache', {
                ...cashtabState.cashtabCache,
                tokens: cashtabCache.tokens,
            });
        }
    };

    useEffect(() => {
        // Update offers when the wallet changes and the new pk has loaded

        if (pk === null) {
            // Do nothing if pk has not yet been set
            return;
        }
        // Reset when pk changes
        setActiveOffersCashtab(null);
        getListedTokens();
    }, [pk]);

    return (
        <>
            {chronikQueryError ? (
                <ActiveOffers title="Chronik Query Error">
                    <Alert>
                        Error querying listed tokens. Please try again later.
                    </Alert>
                </ActiveOffers>
            ) : (
                <>
                    {activeOffersCashtab === null ? (
                        <Spinner title="Loading active offers" />
                    ) : (
                        <>
                            <PageHeader>
                                Agora <AusIcon />
                            </PageHeader>
                            <ActiveOffers title="Active Offers">
                                <SwitchHolder>
                                    <Switch
                                        name="Toggle Active Offers"
                                        on=""
                                        off=""
                                        checked={manageMyOffers}
                                        handleToggle={() => {
                                            setManageMyOffers(
                                                () => !manageMyOffers,
                                            );
                                        }}
                                    />
                                    <SwitchLabel>
                                        Toggle Buy / Manage Listings
                                    </SwitchLabel>
                                </SwitchHolder>
                                {manageMyOffers ? (
                                    <>
                                        <OfferTitle>
                                            Manage your listings
                                        </OfferTitle>

                                        {activeOffersCashtab
                                            .offeredFungibleTokenIdsThisWallet
                                            .length > 0 ? (
                                            <OfferTable>
                                                {activeOffersCashtab.offeredFungibleTokenIdsThisWallet.map(
                                                    offeredTokenId => {
                                                        return (
                                                            <OrderBook
                                                                key={
                                                                    offeredTokenId
                                                                }
                                                                tokenId={
                                                                    offeredTokenId
                                                                }
                                                                cachedTokenInfo={cashtabCache.tokens.get(
                                                                    offeredTokenId,
                                                                )}
                                                                settings={
                                                                    settings
                                                                }
                                                                userLocale={
                                                                    userLocale
                                                                }
                                                                fiatPrice={
                                                                    fiatPrice
                                                                }
                                                                activePk={pk}
                                                                wallet={wallet}
                                                                ecc={ecc}
                                                                chronik={
                                                                    chronik
                                                                }
                                                                agora={agora}
                                                                chaintipBlockheight={
                                                                    chaintipBlockheight
                                                                }
                                                            />
                                                        );
                                                    },
                                                )}
                                            </OfferTable>
                                        ) : (
                                            <p>
                                                You do not have any listed
                                                tokens
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <OfferTitle>Token Offers</OfferTitle>

                                        {activeOffersCashtab
                                            .offeredFungibleTokenIds.length >
                                        0 ? (
                                            <OfferTable>
                                                {activeOffersCashtab.offeredFungibleTokenIds.map(
                                                    offeredTokenId => {
                                                        return (
                                                            <OrderBook
                                                                key={
                                                                    offeredTokenId
                                                                }
                                                                tokenId={
                                                                    offeredTokenId
                                                                }
                                                                cachedTokenInfo={cashtabCache.tokens.get(
                                                                    offeredTokenId,
                                                                )}
                                                                settings={
                                                                    settings
                                                                }
                                                                userLocale={
                                                                    userLocale
                                                                }
                                                                fiatPrice={
                                                                    fiatPrice
                                                                }
                                                                activePk={pk}
                                                                wallet={wallet}
                                                                ecc={ecc}
                                                                chronik={
                                                                    chronik
                                                                }
                                                                agora={agora}
                                                                chaintipBlockheight={
                                                                    chaintipBlockheight
                                                                }
                                                            />
                                                        );
                                                    },
                                                )}
                                            </OfferTable>
                                        ) : (
                                            <p>
                                                No tokens are currently listed
                                                for sale
                                            </p>
                                        )}
                                    </>
                                )}
                            </ActiveOffers>
                        </>
                    )}
                </>
            )}
        </>
    );
};

export default Agora;
