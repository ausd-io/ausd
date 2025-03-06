// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <qt/test/guiutiltests.h>

#include <test/util/setup_common.h>

#include <chainparams.h>
#include <config.h>
#include <key_io.h>
#include <qt/guiutil.h>

namespace {

class GUIUtilTestConfig : public DummyConfig {
public:
    GUIUtilTestConfig()
        : DummyConfig(CBaseChainParams::MAIN), usausCashAddr(true) {}
    void SetCashAddrEncoding(bool b) override { usausCashAddr = b; }
    bool UsausCashAddrEncoding() const override { return usausCashAddr; }

private:
    bool usausCashAddr;
};

} // namespace

void GUIUtilTests::dummyAddressTest() {
    GUIUtilTestConfig config;
    const CChainParams &params = config.GetChainParams();

    std::string dummyaddr;

    dummyaddr = GUIUtil::DummyAddress(params);
    QVERIFY(!IsValidDestinationString(dummyaddr, params));
    QVERIFY(!dummyaddr.empty());
}

void GUIUtilTests::toCurrentEncodingTest() {
    GUIUtilTestConfig config;
    const CChainParams &params = config.GetChainParams();

    // garbage in, garbage out
    QVERIFY(GUIUtil::convertToCashAddr(params, "garbage") == "garbage");

    QString cashaddr_pubkey =
        "auscash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2";

    QString base58_pubkey = "DFxLFMAJWaNYA7TVTUstzPMFRSevAwTSLq";

    QVERIFY(GUIUtil::convertToCashAddr(params, cashaddr_pubkey) ==
            cashaddr_pubkey);
    QVERIFY(GUIUtil::convertToCashAddr(params, base58_pubkey) ==
            cashaddr_pubkey);
}
