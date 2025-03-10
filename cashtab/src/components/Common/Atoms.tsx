// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled, { css } from 'styled-components';
import { Link } from 'react-router-dom';
import { CopyIconButton } from 'components/Common/Buttons';
import { explorer } from 'config/explorer';

export const CashtabScroll = css`
    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-track {
        -webkit-box-shadow: inset 0 0 0 rgba(0, 0, 0, 0);
        background-color: ${props => props.theme.secondaryBackground};
    }

    &::-webkit-scrollbar-thumb {
        border-radius: 10px;
        background-color: ${props => props.theme.accent};
    }
`;

export const WarningFont = styled.div`
    color: ${props => props.theme.wallet.text.primary};
`;

export const LoadingCtn = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 400px;
    flex-direction: column;

    svg {
        width: 50px;
        height: 50px;
        fill: ${props => props.theme.ausCashBlue};
    }
`;

export const TxLink = styled.a`
    color: ${props => props.theme.primary};
`;

export const TokenParamLabel = styled.span`
    font-weight: bold;
`;

export const AlertMsg = styled.p`
    color: ${props => props.theme.forms.error} !important;
`;

export const ConvertAmount = styled.div`
    color: ${props => props.theme.contrast};
    width: 100%;
    font-size: 14px;
    margin-bottom: 10px;
    @media (max-width: 768px) {
        font-size: 12px;
    }
`;

export const StyledLink = styled(Link)`
    color: ${props => props.theme.buttons.styledLink};
    text-decoration: none;
    padding: 8px;
    position: relative;
    border: solid 1px silver;
    border-radius: 10px;
`;

export const SwitchLabel = styled.div`
    text-align: left;
    color: ${props => props.theme.contrast};
    font-size: 18px;
    word-break: break-all;
`;

export const Alert = styled.div`
    background-color: #fff2f0;
    border-radius: 12px;
    color: red;
    padding: 12px;
    margin: 12px 0;
    word-break: break-all;
`;
export const Info = styled.div`
    background-color: #fff2f0;
    border-radius: 12px;
    color: ${props => props.theme.ausCashBlue};
    padding: 12px;
    margin: 12px 0;
`;
export const BlockNotification = styled.div`
    display: flex;
    flex-direction: column;
`;
export const BlockNotificationLink = styled.a`
    display: flex;
    justify-content: flex-start;
    width: 100%;
    color: ${props => props.theme.walletBackground};
    text-decoration: none;
`;
export const BlockNotificationDesc = styled.div`
    display: flex;
    justify-content: flex-start;
    width: 100%;
`;

export const TokenIdAndCopyIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    svg {
        width: 18px;
        height: 18px;
        :hover {
            g {
                fill: ${props => props.theme.ausCashPurple};
            }
            fill: ${props => props.theme.ausCashPurple};
        }
    }
`;

interface TokenIdPreviewProps {
    tokenId: string;
}
export const TokenIdPreview: React.FC<TokenIdPreviewProps> = ({ tokenId }) => {
    return (
        <TokenIdAndCopyIcon>
            <a
                href={`${explorer.blockExplorerUrl}/tx/${tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
            >
                {tokenId.slice(0, 3)}
                ...
                {tokenId.slice(-3)}
            </a>
            <CopyIconButton
                name={`Copy Token ID`}
                data={tokenId}
                showToast
                customMsg={`Token ID "${tokenId}" copied to clipboard`}
            />
        </TokenIdAndCopyIcon>
    );
};

export const PageHeader = styled.h2`
    margin: 0;
    margin-top: 20px;
    color: ${props => props.theme.contrast};
    display: flex;
    align-items: center;
    justify-content: center;
    svg {
        height: 30px;
        width: 30px;
        margin-left: 10px;
    }
    svg path {
        fill: #fff !important;
    }
`;
