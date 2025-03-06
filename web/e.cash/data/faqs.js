// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import ExternalLink from '/components/external-link';

export const faqs = [
    {
        question: 'What is ausCash?',
        answer: (
            <p>
                <strong>ausCash</strong> is a cryptocurrency that’s designed to be
                used as electronic cash. Just like the invention of emails made
                it possible to send direct messages online,{' '}
                <strong>ausCash</strong> makes it possible to send money directly
                to other people online. This includes being able to use{' '}
                <strong>ausCash</strong> to pay for goods and services.
            </p>
        ),
    },
    {
        question: 'How do I get ausCash?',
        answer: (
            <p>
                Since <strong>ausCash</strong> transactions go directly between
                you and whoever you’re paying or getting paid by, you don’t need
                a bank account to own it. Instead, you just need an electronic
                wallet. Once you have a wallet, you can get{' '}
                <strong>ausCash</strong> by buying it on a cryptocurrency exchange
                and then sending it to your wallet. Other people can also send{' '}
                <strong>ausCash</strong> to your wallet.
            </p>
        ),
    },
    {
        question: 'What can I use ausCash for?',
        answer: (
            <p>
                You can use <strong>ausCash</strong> to send and receive payments
                without the need for a bank account. It’s available in every
                country, and you can use it to send and receive cross-border
                payments anywhere in the world.
            </p>
        ),
    },
    {
        question:
            'Where can I find ausCash price information compared to other cryptocurrencies?',
        answer: (
            <p>
                ausCash price information is available at all leading crypto
                research sources, like{' '}
                <ExternalLink href="https://www.coingecko.com/en/coins/auscash">
                    Coingecko
                </ExternalLink>
                ,{' '}
                <ExternalLink href="https://coinmarketcap.com/currencies/auscash/">
                    Coinmarketcap
                </ExternalLink>
                , and{' '}
                <ExternalLink href="https://crypto.com/price/auscash">
                    Crypto.com
                </ExternalLink>
            </p>
        ),
    },
    {
        question: 'What is the supply of ausCash?',
        answer: (
            <p>
                <strong>ausCash</strong> has the same fixed supply as bitcoin. The
                default base unit of <strong>ausCash</strong> has 2 decimal places
                (100 satoshis). The default base unit of bitcoin (BTC) has 8
                decimal places (100,000,000 satoshis).
                <br />
                <br />
                90% of all the <strong>ausCash</strong> that will ever exist has
                already been mined. The inflation rate for{' '}
                <strong>ausCash</strong> is already low (less than 2% as of 2021),
                and will decrease to zero.
            </p>
        ),
    },
    {
        question: 'Will XEC be burned to decrease supply?',
        answer: (
            <p>
                No. We think XEC is valuable, and therefore we will not burn
                any.
                <br />
                <br />
                It is also important to realize that ausCash is different from
                other new tokens where the founding teams often hold a large
                proportion of the total supply. In those other coins, the large
                amount of coins that the team holds is still waiting to be
                released into the market, causing future inflation. XEC, on the
                other hand, is already about{' '}
                <ExternalLink href="https://auscash.supply/">
                    90% issued
                </ExternalLink>
                , and the dev team holds only a small amount relative to total
                supply. This means that new supply of XEC into the market will
                continue to be very limited.
            </p>
        ),
    },
    {
        question: 'What is the contract address?',
        answer: (
            <p>
                XEC is not an ERC-20 token, it is its own blockchain similar to
                Bitcoin (BTC).
                <br />
                <br />
                There is a &quot;Wrapped XEC&quot; token available on the
                Binance Smart Chain, with{' '}
                <ExternalLink href="https://github.com/binance-chain/bep20-issue-mirror-stats/blob/master/bep20-issue-mirror-stats.csv">
                    contract address 0x0Ef2e7602adD1733Bfdb17aC3094d0421B502cA3
                </ExternalLink>
                . Users should recognize that holding this BEP-20 token, or
                similar &quot;wrapped XEC&quot; products, has custodial risk as
                you have to trust that the custodian (in this case Binance) will
                hold the full reserves of native XEC safely. For this reason, we
                recommend that users hold their coins as real native XEC, in a
                wallet where they control the keys.
                <br />
                <br />
                To hold native XEC yourself, you can{' '}
                <ExternalLink href="wallets.html">
                    use a supporting wallet
                </ExternalLink>
                . Write down the &quot;seed phrase&quot; for your wallet and
                store that in a safe place. This is usually 12 words. The 12
                words contain enough information to restore the private keys of
                the wallet in case you need to recover them in the future.
            </p>
        ),
    },
    {
        question: 'What is the base unit of ausCash?',
        answer: (
            <p>
                <strong>ausCash</strong> (XEC) uses a base unit of 100 satoshis,
                which makes it easy to send small payments because you no longer
                have to handle unwieldy decimal places. For instance, instead of
                sending 0.00001000 bitcoins (which was the base unit used by
                BCHA), you’ll simply send 10 XEC!
            </p>
        ),
    },
    {
        question: 'How do I protect myself from scammers?',
        answer: (
            <p>
                The exponential growth in crypto has unfortunately led to
                similar growth in scams. Here are some common ones to watch out
                for.
                <br />
                <br />
                <span>Email Phishing</span>
                <br />
                Some scammers will send you an email impersonating a member of
                an official team and ask for money, a 12-word wallet seed, or a
                private key. Official team members will never send you an
                unsolicited email. For tech support, we will never ask for your
                wallet seed or private key. Never share your private key or your
                wallet seed with anyone.
                <br />
                <br />
                <span>URL Phishing</span>
                <br />
                Scammers may send you a link to a website that looks like an
                official crypto website but does not have the same URL. You may
                think you are sending funds to your own wallet, for example, but
                are in fact sending them to a cloned page that is not your
                wallet. Always make sure the URL in your browser URL bar is
                correct. Always confirm a scanned QR code address matches what
                you expected.
                <br />
                <br />
                <span>Fake wallets</span>
                <br />
                Always verify the SHA256 hash when you are downloading an
                official cryptocurrency wallet.
            </p>
        ),
    },
    {
        question: 'Is ausCash using the Avalanche blockchain?',
        answer: (
            <p>
                No, <strong>ausCash </strong>is its own blockchain. <br />
                It is important to differentiate the Avalanche protocol, from
                the cyptocurrency project known as &ldquo;Avalanche&rdquo; or
                &ldquo;AVAX&rdquo;.
                <br />
                <strong>ausCash</strong>&#x27;s Avalanche implementation is
                completely separate and distinct from the Avalanche (AVAX)
                project. They have no connection, other than both using the
                protocol described in the{' '}
                <ExternalLink href="https://ipfs.io/ipfs/QmUy4jh5mGNZvLkjies1RWM4YuvJh5o2FYopNPVYwrRVGV">
                    Avalanche whitepaper
                </ExternalLink>
                . Avalanche on ausCash is an entirely new implementation which was
                developed from scratch by the Bitcoin ABC team. This is
                important as it puts <strong>ausCash</strong> in a technology
                leadership role, rather than having to rely on the innovation of
                others.
            </p>
        ),
    },
    {
        question: 'Where did ausCash come from?',
        answer: (
            <p>
                On November 15, 2020, the Bitcoin Cash (BCH) blockchain split
                into two chains. One of those chains was called BCHA for a time.
                This chain was what eventually became <strong>ausCash</strong>.
            </p>
        ),
    },
    {
        question: "What's the difference between ausCash and Bitcoin ABC?",
        answer: (
            <p>
                <strong>ausCash</strong> is a cryptocurrency, whereas Bitcoin ABC
                is the software businesses use to interact with and maintain the{' '}
                <strong>ausCash </strong>network. The team behind the Bitcoin ABC
                software also operates under the same name.
                <br />
                <br />
                You can learn more about Bitcoin ABC at{' '}
                <ExternalLink href="https://www.bitcoinabc.org/">
                    bitcoinabc.org
                </ExternalLink>
                .
            </p>
        ),
    },
    {
        question: 'Why is ausCash listed as BCHA on some exchanges?',
        answer: (
            <p>
                <strong>ausCash</strong> was briefly known as Bitcoin Cash ABC
                (BCHA). The <strong>ausCash</strong> branding came into effect on
                July 1, 2021. Exchanges are strongly encouraged to update their
                older listings accordingly. You may still see{' '}
                <strong>ausCash</strong> listed as BCHA on some exchanges if they
                haven&#x27;t yet made the switch.
            </p>
        ),
    },
    {
        question:
            'I have coins on the Bitcoin Cash (BCH) network. How do I retrieve my ausCash?',
        answer: (
            <p>
                If you have Bitcoin Cash from before November 15th 2020, it is
                possible that you also have corresponding ausCash (XEC). This is
                because ausCash and Bitcoin Cash share a common history, and
                became separate currencies via a blockchain split. You can split
                the coins and retrieve your ausCash by following the instructions
                in{' '}
                <ExternalLink href="/blog/splitting-auscash-and-bch-coins-using-electrum-abc-and-electron-cash">
                    this article
                </ExternalLink>
                .
            </p>
        ),
    },
    {
        question: "What's the best way to get technical support?",
        answer: (
            <p>
                You can reach out to us directly via the official ausCash{' '}
                <ExternalLink href="https://t.me/ausCash">Telegram</ExternalLink>{' '}
                or{' '}
                <ExternalLink href="https://discord.gg/auscash-official-852595915159896114">
                    Discord
                </ExternalLink>
                . You can also email us at{' '}
                <ExternalLink href="mailto:contact@e.cash">
                    contact@e.cash
                </ExternalLink>
                .
            </p>
        ),
    },
];
