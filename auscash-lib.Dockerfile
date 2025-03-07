# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Stage 1 - rust machine for building auscash-lib-wasm
FROM rust:1.76.0 AS wasmbuilder

RUN apt-get update \
  && apt-get install clang binaryen -y \
  && rustup target add wasm32-unknown-unknown \
  && cargo install -f wasm-bindgen-cli@0.2.92

# Copy Cargo.toml
WORKDIR /app/
COPY Cargo.toml .

# Copy chronik to same directory structure as monorepo
# This needs to be in place to run ./build-wasm
WORKDIR /app/chronik/
COPY chronik/ .

# Copy secp256k1 to same directory structure as monorepo
WORKDIR /app/src/secp256k1
COPY src/secp256k1/ .

# Copy auscash-secp256k1, auscash-lib and auscash-lib-wasm files to same directory structure as monorepo
WORKDIR /app/modules/auscash-secp256k1
COPY modules/auscash-secp256k1 .
WORKDIR /app/modules/auscash-lib
COPY modules/auscash-lib .
WORKDIR /app/modules/auscash-lib-wasm
COPY modules/auscash-lib-wasm .

# Build web assembly for auscash-lib
RUN CC=clang ./build-wasm.sh

# Stage 2 - Node image for running npm publish
FROM node:20-bookworm-slim

# Copy static assets from wasmbuilder stage (auscash-lib-wasm and auscash-lib, with wasm built in place)
WORKDIR /app/modules
COPY --from=wasmbuilder /app/modules .

# Build auscash-lib
WORKDIR /app/modules/auscash-lib
# Install auscashaddrjs from npm, so that module users install it automatically
RUN npm install auscashaddrjs@latest
# Install chronik-client from npm, so that module users install it automatically
RUN npm install -D chronik-client@latest
RUN npm ci
RUN npm run build

# Publish auscash-lib
CMD [ "npm", "publish" ]
