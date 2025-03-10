// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState } from 'react';
import styled from 'styled-components';
import { WalletContext } from 'wallet/context';
import { Link } from 'react-router-dom';
import TxHistory from './TxHistory';
import ApiError from 'components/Common/ApiError';
import { getWalletState } from 'utils/cashMethods';
import Receive from 'components/Receive/Receive';
import { Alert, Info } from 'components/Common/Atoms';
import { getUserLocale } from 'helpers';
import { getHashes } from 'wallet';
import PrimaryButton, {
    SecondaryButton,
    PrimaryLink,
    SecondaryLink,
} from 'components/Common/Buttons';
import { toast } from 'react-toastify';
import { token as tokenConfig } from 'config/token';
import { InlineLoader } from 'components/Common/Spinner';
import { load } from 'recaptcha-v3';

export const Tabs = styled.div`
    margin: auto;
    display: inline-block;
    text-align: center;
    width: 100%;
    margin: 20px 0;
`;

export const TabLabel = styled.button`
    :focus,
    :active {
        outline: none;
    }
    color: ${props => props.theme.lightWhite};
    border: none;
    background: none;
    font-size: 18px;
    cursor: pointer;
    margin: 0 20px;
    padding: 0;

    @media (max-width: 400px) {
        font-size: 16px;
    }

    ${({ active, ...props }) =>
        active &&
        `    
        color: ${props.theme.contrast};
        border-bottom: 2px solid ${props.theme.ausCashBlue}   
       
  `}
    ${({ token, ...props }) =>
        token &&
        `
        border-color:${props.theme.ausCashPurple} 
  `}
`;

export const TxHistoryCtn = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: ${props => props.theme.contrast};
    background-color: ${props => props.theme.primaryBackground};
    padding: 20px;
    border-radius: 10px;
    @media (max-width: 768px) {
        border-radius: 0;
    }
`;

export const AlertLink = styled(Link)`
    color: red;
    :hover {
        color: #000;
    }
`;

export const ExternalLink = styled.a`
    color: ${props => props.theme.darkBlue};
    width: 100%;
    font-size: 16px;
    margin: 0 0 20px 0;
    border: 1px solid ${props => props.theme.darkBlue};
    padding: 14px 0;
    display: inline-block;
    border-radius: 3px;
    transition: all 200ms ease-in-out;
    svg {
        fill: ${props => props.theme.darkBlue};
        transition: all 200ms ease-in-out;
    }
    :hover {
        color: ${props => props.theme.ausCashBlue};
        border-color: ${props => props.theme.ausCashBlue};
        svg {
            fill: ${props => props.theme.ausCashBlue};
        }
    }
    @media (max-width: 768px) {
        padding: 10px 0;
        font-size: 14px;
    }
`;

export const AddrSwitchContainer = styled.div`
    text-align: center;
    padding: 6px 0 12px 0;
`;

export const AirdropButton = styled(PrimaryButton)`
    margin-bottom: 0;
    div {
        margin: auto;
    }
`;
export const TokenRewardButton = styled(SecondaryButton)`
    margin-bottom: 0;
    div {
        margin: auto;
    }
`;

const Home = () => {
    const ContextValue = React.useContext(WalletContext);
    const {
        fiatPrice,
        apiError,
        cashtabState,
        updatausCashtabState,
        chaintipBlockheight,
    } = ContextValue;
    const { settings, wallets } = cashtabState;
    const wallet = wallets.length > 0 ? wallets[0] : false;
    const hashes = getHashes(wallet);
    const walletState = getWalletState(wallet);
    const { parsedTxHistory } = walletState;
    const hasHistory = parsedTxHistory && parsedTxHistory.length > 0;

    // Want to show a msg to users who have just claimed a free XEC reward, or users who have just received
    // a few txs
    const isNewishWallet =
        hasHistory &&
        parsedTxHistory &&
        parsedTxHistory.length < 3 &&
        wallet.state.balanceSats > 0;

    const userLocale = getUserLocale(navigator);

    const [airdropPending, setAirdropPending] = useState(false);
    const [tokenRewardsPending, setTokenRewardsPending] = useState(false);

    const claimAirdropForNewWallet = async () => {
        // Disable the button to prevent double claims
        setAirdropPending(true);
        const recaptcha = await load(process.env.REACT_APP_RECAPTCHA_SITE_KEY);
        const token = await recaptcha.execute('claimxec');

        // Claim rewards
        // We only show this option if wallet has no tx history. Such a wallet is always
        // expected to be eligible.
        let claimResponse;
        try {
            claimResponse = await (
                await fetch(
                    `${tokenConfig.rewardsServerBaseUrl}/claimxec/${
                        wallet.paths.get(1899).address
                    }`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ token }),
                    },
                )
            ).json();
            // Could help in debugging from user reports
            console.info(claimResponse);
            if ('error' in claimResponse) {
                throw new Error(`${claimResponse.error}:${claimResponse.msg}`);
            }
            toast.success('Free ausCash claimed!');
            // Note we do not setAirdropPending(false) on a successful claim
            // The button will disappear when the tx is seen by the wallet
            // We do not want the button to be enabled before this
        } catch (err) {
            setAirdropPending(false);
            console.error(err);
            toast.error(`${err}`);
        }
    };

    const claimTokenRewardsForNewWallet = async () => {
        // Disable the button to prevent double claims
        setTokenRewardsPending(true);
        // Claim rewards
        // We only show this option if wallet has no tx history. Such a wallet is always
        // expected to be eligible.
        let claimResponse;
        try {
            claimResponse = await (
                await fetch(
                    `${tokenConfig.rewardsServerBaseUrl}/claim/${
                        wallet.paths.get(1899).address
                    }`,
                )
            ).json();
            // Could help in debugging from user reports
            console.info(claimResponse);
            if ('error' in claimResponse) {
                throw new Error(`${claimResponse.error}:${claimResponse.msg}`);
            }
            toast.success(
                'Token rewards claimed! Check "Rewards" menu option for more.',
            );
            // Note we do not setTokenRewardsPending(false) on a successful claim
            // The button will disappear when the tx is seen by the wallet
            // We do not want the button to be enabled before this
        } catch (err) {
            setTokenRewardsPending(false);
            console.error(err);
            toast.error(`${err}`);
        }
    };

    return (
        <>
            {apiError && <ApiError />}
            <TxHistoryCtn data-testid="tx-history">
                <TxHistory
                    txs={Array.isArray(parsedTxHistory) ? parsedTxHistory : []}
                    hashes={hashes}
                    fiatPrice={fiatPrice}
                    fiatCurrency={
                        settings && settings.fiatCurrency
                            ? settings.fiatCurrency
                            : 'usd'
                    }
                    cashtabState={cashtabState}
                    updatausCashtabState={updatausCashtabState}
                    userLocale={userLocale}
                    chaintipBlockheight={chaintipBlockheight}
                />
                {isNewishWallet && (
                    <>
                        <Info style={{ marginBottom: '20px' }}>
                            ℹ️ Nice, you have some ausCash. What can you do?
                        </Info>
                        <PrimaryLink to="/create-token">
                            Create a token
                        </PrimaryLink>
                        <SecondaryLink to="/create-nft-collection">
                            Mint an NFT
                        </SecondaryLink>
                        <Info>
                            💰 You could also earn more by monetizing your
                            content at{' '}
                            <a
                                href="https://auscashchat.com/"
                                target="_blank"
                                rel="noreferrer"
                            >
                                ausCashChat.
                            </a>
                        </Info>
                    </>
                )}
                {!hasHistory && (
                    <>
                        <Alert>
                            <p>
                                <b>
                                    <AlertLink to="/backup">
                                        Backup your wallet
                                    </AlertLink>
                                </b>
                            </p>
                            <p>
                                Write down your 12-word seed and keep it in a
                                safe place.{' '}
                                <em>Do not share your backup with anyone.</em>
                            </p>
                        </Alert>
                        {process.env.REACT_APP_BUILD_ENV !== 'extension' &&
                            process.env.REACT_APP_TESTNET !== 'true' && (
                                <>
                                    {wallets.length === 1 ? (
                                        <AirdropButton
                                            onClick={claimAirdropForNewWallet}
                                            disabled={airdropPending}
                                        >
                                            {airdropPending ? (
                                                <InlineLoader
                                                    style={{ margin: 'auto' }}
                                                />
                                            ) : (
                                                'Claim Free XEC'
                                            )}
                                        </AirdropButton>
                                    ) : (
                                        <TokenRewardButton
                                            onClick={
                                                claimTokenRewardsForNewWallet
                                            }
                                            disabled={tokenRewardsPending}
                                        >
                                            {tokenRewardsPending ? (
                                                <InlineLoader
                                                    style={{ margin: 'auto' }}
                                                />
                                            ) : (
                                                'Claim Token Rewards'
                                            )}
                                        </TokenRewardButton>
                                    )}
                                </>
                            )}

                        <Receive />
                    </>
                )}
            </TxHistoryCtn>
        </>
    );
};

export default Home;
