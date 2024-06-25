# Copyright (c) 2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""This test reproduces the unittest deterministic chain setup and verifies
the checkpoints and coinstatindexes."""

from test_framework.key import ECKey
from test_framework.messages import COIN, CBlock, COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.script import OP_CHECKSIG, CScript, CScriptNum, CScriptOp
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal

INITIAL_MOCKTIME = 1598887952


def get_coinbase_scriptsig(height: int) -> bytes:
    OP_1 = 0x51
    if height <= 16:
        bip34_coinbase_height = bytes([OP_1 + height - 1])
    else:
        bip34_coinbase_height = CScriptNum.encode(CScriptNum(height))
    excessive_blocksize_sig = CScriptOp.encode_op_pushdata(b"/EB32.0/")
    return bip34_coinbase_height + excessive_blocksize_sig


def get_coinbase(height: int, pubkey: bytes) -> CTransaction:
    coinbase = CTransaction()
    coinbase.nVersion = 2
    coinbase.vin.append(
        CTxIn(COutPoint(0, 0xFFFFFFFF), get_coinbase_scriptsig(height), 0xFFFFFFFF)
    )
    coinbaseoutput = CTxOut()
    coinbaseoutput.nValue = 50 * COIN
    regtest_halvings = int(height / 150)
    coinbaseoutput.nValue >>= regtest_halvings
    coinbaseoutput.scriptPubKey = CScript([pubkey, OP_CHECKSIG])
    coinbase.vout = [coinbaseoutput]
    coinbase.calc_sha256()
    return coinbase


def get_empty_block(
    height: int, base_block_hash: str, block_time: int, coinbase_pubkey: bytes
) -> CBlock:
    block = CBlock()
    block.nVersion = 0x20000000
    block.nTime = block_time
    block.hashPrevBlock = int(base_block_hash, 16)
    # difficulty retargeting is disabled in REGTEST chainparams
    block.nBits = 0x207FFFFF
    block.vtx.append(get_coinbase(height, coinbase_pubkey))
    block.hashMerkleRoot = block.calc_merkle_root()
    block.solve()
    return block


class DeterministicChainSetupTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True

    def run_test(self):
        node = self.nodes[0]
        genesis_hash = node.getbestblockhash()

        coinbase_key = ECKey()
        coinbase_key.set(31 * b"\x00" + b"\x01", compressed=True)
        coinbase_pubkey = coinbase_key.get_pubkey().get_bytes()

        tip = genesis_hash
        chain_height = 1
        mock_time = INITIAL_MOCKTIME

        def mine_blocks(num_blocks: int):
            nonlocal tip
            nonlocal chain_height
            nonlocal mock_time
            for _ in range(num_blocks):
                block = get_empty_block(chain_height, tip, mock_time, coinbase_pubkey)
                assert node.submitblock(block.serialize().hex()) is None

                tip = node.getbestblockhash()
                chain_height += 1
                mock_time += 1

        self.log.info("Reproduce the assertion in the TestChain100Setup constructor.")
        mine_blocks(100)
        assert_equal(
            tip, "8916b4cf6a6dbb901536365ed5541e39f9ec3b95880762300d0401360bd9cce9"
        )

        self.log.info("Check m_assumeutxo_data at height 110.")
        mine_blocks(10)
        assert_equal(node.getblockchaininfo()["blocks"], 110)
        assert_equal(
            node.gettxoutsetinfo()["hash_serialized"],
            "1044c43d9fb50a5370fa67c114db0555b4f14842b955cb11652663a4c22d1be2",
        )

        self.log.info("Check m_assumeutxo_data at height 210.")
        mine_blocks(100)
        assert_equal(node.getblockchaininfo()["blocks"], 210)
        assert_equal(
            node.gettxoutsetinfo()["hash_serialized"],
            "9aba7b8b03f5cd2396f9dfab892e17f8c9307b9d9e1ebcacd1bd4fa99eb01249",
        )


if __name__ == "__main__":
    DeterministicChainSetupTest().main()
