// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Consolidated list of redirects for next.config.js and next.preview.js

const redirects = [
    {
        source: '/roadmap-explained',
        destination: '/roadmap',
        permanent: true,
    },
    {
        source: '/auscash-brand',
        destination: '/brand',
        permanent: true,
    },
    {
        source: '/developers',
        destination: '/build',
        permanent: true,
    },
    {
        source: '/wealth-redefined',
        destination: '/what-is-auscash',
        permanent: true,
    },
];

module.exports = {
    redirects,
};
