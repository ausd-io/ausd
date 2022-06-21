// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chain.h>
#include <chainparams.h>
#include <config.h>
#include <util/time.h>
#include <validation.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(finalization_tests, TestChain100Setup)

BOOST_AUTO_TEST_CASE(finalizationDelay) {
    CScript p2pk_scriptPubKey =
        CScript() << ToByteVector(coinbaseKey.GetPubKey()) << OP_CHECKSIG;
    CBlock block;

    {
        LOCK(cs_main);
        // We should have no finalized block because the 100 blocks generated by
        // the test setup are too close to "now";
        BOOST_CHECK_MESSAGE(
            m_node.chainman->ActiveChainstate().GetFinalizedBlock() == nullptr,
            "No block finalized (tip at height "
                << m_node.chainman->ActiveHeight() << ")");
    }

    // Create maxreorgdepth blocks. Auto-finalization will not occur because
    // the delay is not expired
    int64_t mockedTime = GetTime();
    for (uint32_t i = 0; i < DEFAULT_MAX_REORG_DEPTH; i++) {
        block = CreateAndProcessBlock({}, p2pk_scriptPubKey);
        LOCK(cs_main);
        // These blocks are too recent.
        BOOST_CHECK_MESSAGE(
            m_node.chainman->ActiveChainstate().GetFinalizedBlock() == nullptr,
            "No block finalized (tip at height "
                << m_node.chainman->ActiveHeight() << ")");
    }

    // Make the finalization time to expire
    mockedTime += DEFAULT_MIN_FINALIZATION_DELAY + 1;
    SetMockTime(mockedTime);

    // Next maxreorgdepth blocks should cause auto-finalization
    CBlockIndex *blockToFinalize = m_node.chainman->ActiveTip()->GetAncestor(
        m_node.chainman->ActiveHeight() - DEFAULT_MAX_REORG_DEPTH);

    for (uint32_t i = 0; i < DEFAULT_MAX_REORG_DEPTH; i++) {
        blockToFinalize = m_node.chainman->ActiveChain().Next(blockToFinalize);
        block = CreateAndProcessBlock({}, p2pk_scriptPubKey);
        LOCK(cs_main);
        BOOST_CHECK_MESSAGE(
            m_node.chainman->ActiveChainstate().GetFinalizedBlock() ==
                blockToFinalize,
            "Block finalized at height "
                << blockToFinalize->nHeight << " (tip at height "
                << m_node.chainman->ActiveHeight() << ")");
    }

    // Next blocks won't cause auto-finalization because the delay is not
    // expired
    for (uint32_t i = 0; i < DEFAULT_MAX_REORG_DEPTH; i++) {
        block = CreateAndProcessBlock({}, p2pk_scriptPubKey);
        LOCK(cs_main);
        // These blocks are finalized.
        BOOST_CHECK_MESSAGE(
            m_node.chainman->ActiveChainstate().GetFinalizedBlock() ==
                blockToFinalize,
            "Finalized block remains unchanged at height "
                << blockToFinalize->nHeight << " (tip at height "
                << m_node.chainman->ActiveHeight() << ")");
    }

    // Make the finalization time to expire
    mockedTime += DEFAULT_MIN_FINALIZATION_DELAY + 1;
    SetMockTime(mockedTime);

    blockToFinalize = m_node.chainman->ActiveTip()->GetAncestor(
        m_node.chainman->ActiveHeight() - DEFAULT_MAX_REORG_DEPTH);

    // Create some more blocks.
    // Finalization should start moving again.
    for (uint32_t i = 0; i < DEFAULT_MAX_REORG_DEPTH; i++) {
        blockToFinalize = m_node.chainman->ActiveChain().Next(blockToFinalize);
        block = CreateAndProcessBlock({}, p2pk_scriptPubKey);
        LOCK(cs_main);
        BOOST_CHECK_MESSAGE(
            m_node.chainman->ActiveChainstate().GetFinalizedBlock() ==
                blockToFinalize,
            "Block finalized at height "
                << blockToFinalize->nHeight << " (tip at height "
                << m_node.chainman->ActiveHeight() << ")");
    }
}

BOOST_AUTO_TEST_SUITE_END()
