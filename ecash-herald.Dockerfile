# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Multi-stage
# 1) rust image for auscash-lib
# 2) Node image for prod deployment of auscash-lib

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

# Node image for prod deployment of auscash-herald

FROM node:20-bookworm-slim

# Copy static assets from WasmBuilder stage (auscash-lib-wasm and auscash-lib, with wasm built in place)
WORKDIR /app/modules
COPY --from=WasmBuilder /app/modules .

# Build all local auscash-herald dependencies

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

# auscash-script
WORKDIR /app/modules/auscash-script
COPY modules/auscash-script/ .
RUN npm ci

# auscash-lib
WORKDIR /app/modules/auscash-lib
RUN npm ci
RUN npm run build

# auscash-agora
WORKDIR /app/modules/auscash-agora
COPY modules/auscash-agora/ .
RUN npm ci
RUN npm run build

# mock-chronik-client
WORKDIR /app/modules/mock-chronik-client
COPY modules/mock-chronik-client/ .
RUN npm ci

# Now that local dependencies are ready, build auscash-herald
WORKDIR /app/apps/auscash-herald

# Copy only the package files and install necessary dependencies.
# This reduces cache busting when source files are changed.
COPY apps/auscash-herald/package.json .
COPY apps/auscash-herald/package-lock.json .
RUN npm ci

# Copy the rest of the project files
COPY apps/auscash-herald/ .

# Compile typescript. Outputs to dist/ dir
RUN npm run build

# auscash-herald runs with "node dist/index.js"
CMD [ "node", "dist/index.js" ]
