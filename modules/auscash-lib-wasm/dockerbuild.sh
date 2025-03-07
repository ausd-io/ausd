#!/usr/bin/env bash
export LC_ALL=C.UTF-8

docker build . -t auscash-lib-build-wasm

docker run \
    -v "$(pwd)/../../:/bitcoin-abc" \
    -w /bitcoin-abc/modules/auscash-lib-wasm \
    auscash-lib-build-wasm \
    ./build-wasm.sh
