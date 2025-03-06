# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Multi-stage
# 1) rust image for auscash-lib
# 2) Node image for prod deployment of token-server

# 1) rust image for auscash-lib
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

# 2) Node image for prod deployment of token-server

FROM node:20-bookworm-slim

# Copy static assets from wasmbuilder stage (auscash-lib-wasm and auscash-lib, with wasm built in place)
WORKDIR /app/modules
COPY --from=wasmbuilder /app/modules .

# Build all local token-server dependencies

# auscashaddrjs
WORKDIR /app/modules/auscashaddrjs
COPY modules/auscashaddrjs/ .
RUN npm ci
RUN npm run build

# chronik-client
WORKDIR /app/modules/chronik-client
COPY modules/chronik-client/ .
RUN npm ci
RUN npm run build

# auscash-lib
WORKDIR /app/modules/auscash-lib
RUN npm ci
RUN npm run build

# Now that local dependencies are ready, build token-server
WORKDIR /app/apps/token-server

# Copy only the package files and install necessary dependencies.
# This reduces cache busting when source files are changed.
COPY apps/token-server/package.json .
COPY apps/token-server/package-lock.json .
RUN npm ci

# Copy the rest of the project files
COPY apps/token-server/ .

# Compile typescript. Outputs to dist/ dir
RUN npm run build

# token-server runs with "node dist/index.js"
CMD [ "node", "dist/index.js" ]
