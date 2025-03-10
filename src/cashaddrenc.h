// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#ifndef BITCOIN_CASHADDRENC_H
#define BITCOIN_CASHADDRENC_H

#include <script/standard.h>

#include <string>
#include <vector>

class CChainParams;

enum CashAddrType : uint8_t { PUBKEY_TYPE = 0, SCRIPT_TYPE = 1 };

struct CashAddrContent {
    CashAddrType type;
    std::vector<uint8_t> hash;
};

std::string EncodausCashAddr(const CTxDestination &, const CChainParams &);
std::string EncodausCashAddr(const std::string &prefix,
                           const CashAddrContent &content);

CTxDestination DecodausCashAddr(const std::string &addr,
                              const CChainParams &params);
CashAddrContent DecodausCashAddrContent(const std::string &addr,
                                      const std::string &prefix);
CTxDestination DecodausCashAddrDestination(const CashAddrContent &content);

std::vector<uint8_t> PackCashAddrContent(const CashAddrContent &content);
#endif // BITCOIN_CASHADDRENC_H
