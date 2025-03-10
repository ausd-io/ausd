// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { __setEcc } from './ecc.js';
import __wbg_init, * as ffi from './ffi/auscash_lib_wasm_browser.js';
import { __setHashes } from './hash.js';

/** Load and initialize the WASM module for Web */
export async function initWasm() {
    await __wbg_init();
    __setEcc(ffi.Ecc);
    __setHashes({
        sha256: ffi.sha256,
        sha256d: ffi.sha256d,
        shaRmd160: ffi.shaRmd160,
    });
}
