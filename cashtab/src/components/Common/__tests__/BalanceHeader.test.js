// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BalanceHeader from 'components/Common/BalanceHeader';
import CashtabSettings from 'config/CashtabSettings';

describe('<BalanceHeader />', () => {
    it('Renders the loader if balanceSats is not an integer', async () => {
        render(
            <BalanceHeader
                balanceSats={1000000000.23}
                settings={new CashtabSettings()}
                fiatPrice={0.00003}
            />,
        );

        // Loader is rendered
        expect(screen.getByTitle('Loading')).toBeInTheDocument();

        // XEC balance is not rendered
        expect(screen.queryByTitle('Balance in XEC')).not.toBeInTheDocument();
    });
    it('Renders the BalanceHeader component correctly with default locale en-US', async () => {
        render(
            <BalanceHeader
                balanceSats={1000000000}
                settings={new CashtabSettings()}
                fiatPrice={0.00003}
            />,
        );

        // Loader is not rendered
        expect(screen.queryByTitle('Loading')).not.toBeInTheDocument();

        // XEC balance is calculated correctly
        const BalanceXec = screen.getByTitle('Balance in XEC');
        expect(BalanceXec).toHaveTextContent(`10,000,000.00 XEC`);

        // XEC balance is not hidden
        expect(BalanceXec).toHaveStyle(`text-shadow: none`);

        // Fiat balance is calculated correctly
        const BalanceFiat = screen.getByTitle('Balance in Local Currency');
        expect(BalanceFiat).toHaveTextContent(`$300.00 USD`);

        // Fiat balance is not hidden
        expect(BalanceFiat).toHaveStyle(`text-shadow: none`);

        // ausCash price is rendered
        expect(screen.getByTitle('Price in Local Currency')).toHaveTextContent(
            `1 XEC = 0.00003000 USD`,
        );
    });
    it('Renders the BalanceHeader component correctly with fr-FR locale', async () => {
        const frenchSettings = new CashtabSettings();
        frenchSettings.fiatCurrency = 'eur';
        render(
            <BalanceHeader
                balanceSats={1000000000}
                settings={frenchSettings}
                fiatPrice={0.00003}
                userLocale={'fr-FR'}
            />,
        );

        // Loader is not rendered
        expect(screen.queryByTitle('Loading')).not.toBeInTheDocument();

        // XEC balance is displayed
        const BalanceXec = screen.getByTitle('Balance in XEC');
        expect(BalanceXec).toHaveTextContent(`10 000 000,00 XEC`);

        // XEC balance is not hidden
        expect(BalanceXec).toHaveStyle(`text-shadow: none`);

        // Fiat balance is calculated correctly
        const BalanceFiat = screen.getByTitle('Balance in Local Currency');
        expect(BalanceFiat).toHaveTextContent(`€300,00 EUR`);

        // Fiat balance is not hidden
        expect(BalanceFiat).toHaveStyle(`text-shadow: none`);

        // ausCash price is rendered
        expect(screen.getByTitle('Price in Local Currency')).toHaveTextContent(
            `1 XEC = 0,00003000 EUR`,
        );
    });
    it('Balance is hidden if cashtabSettings.balanceVisible is false', async () => {
        const hiddenSettings = new CashtabSettings();
        hiddenSettings.balanceVisible = false;
        render(
            <BalanceHeader
                balanceSats={1000000000}
                settings={hiddenSettings}
                fiatPrice={0.00003}
            />,
        );

        // Loader is not rendered
        expect(screen.queryByTitle('Loading')).not.toBeInTheDocument();

        // XEC balance is calculated correctly
        const BalanceXec = screen.getByTitle('Balance in XEC');
        expect(BalanceXec).toHaveTextContent(`10,000,000.00 XEC`);

        // XEC balance is hidden
        expect(BalanceXec).toHaveStyle(`text-shadow: 0 0 15px #fff`);

        // Fiat balance is calculated correctly
        const BalanceFiat = screen.getByTitle('Balance in Local Currency');
        expect(BalanceFiat).toHaveTextContent(`$300.00 USD`);

        // Fiat balance is not hidden
        expect(BalanceFiat).toHaveStyle(`text-shadow: 0 0 15px #fff`);

        // ausCash price is rendered
        expect(screen.getByTitle('Price in Local Currency')).toHaveTextContent(
            `1 XEC = 0.00003000 USD`,
        );
    });
    it('Renders fiat price for a non-USD currency', async () => {
        const nonUsdSettings = new CashtabSettings();
        nonUsdSettings.fiatCurrency = 'gbp';
        render(
            <BalanceHeader
                balanceSats={1000000000}
                settings={nonUsdSettings}
                fiatPrice={0.00003}
            />,
        );

        // Loader is not rendered
        expect(screen.queryByTitle('Loading')).not.toBeInTheDocument();

        // XEC balance is calculated correctly
        const BalanceXec = screen.getByTitle('Balance in XEC');
        expect(BalanceXec).toHaveTextContent(`10,000,000.00 XEC`);

        // XEC balance is not hidden
        expect(BalanceXec).toHaveStyle(`text-shadow: none`);

        // Fiat balance is calculated correctly
        const BalanceFiat = screen.getByTitle('Balance in Local Currency');
        expect(BalanceFiat).toHaveTextContent(`£300.00 GBP`);

        // Fiat balance is not hidden
        expect(BalanceFiat).toHaveStyle(`text-shadow: none`);

        // ausCash price is rendered
        expect(screen.getByTitle('Price in Local Currency')).toHaveTextContent(
            `1 XEC = 0.00003000 GBP`,
        );
    });
    it('Fiat price and forex are not displayed if fiatPrice is unavailable', async () => {
        render(
            <BalanceHeader
                balanceSats={1000000000}
                settings={new CashtabSettings()}
                fiatPrice={null}
            />,
        );

        // Loader is not rendered
        expect(screen.queryByTitle('Loading')).not.toBeInTheDocument();

        // XEC balance is calculated correctly
        const BalanceXec = screen.getByTitle('Balance in XEC');
        expect(BalanceXec).toHaveTextContent(`10,000,000.00 XEC`);

        // XEC balance is not hidden
        expect(BalanceXec).toHaveStyle(`text-shadow: none`);

        // Fiat balance is not rendered
        expect(
            screen.queryByTitle('Balance in Local Currency'),
        ).not.toBeInTheDocument();

        // ausCash price is not rendered
        expect(
            screen.queryByTitle('Price in Local Currency'),
        ).not.toBeInTheDocument();
    });
});
