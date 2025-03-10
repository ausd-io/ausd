#!/usr/bin/env bash

export LC_ALL=C

set -euxo pipefail

###
# Initial Block Download script.
#
# Runs a ausd process until initial block download is complete.
# Forwards the exit code from ausd onward.
###

MYPID=$$

# Setup
: "${TOPLEVEL:=$(git rev-parse --show-toplevel)}"
: "${BUILD_DIR:=${TOPLEVEL}/build}"
: "${BITCOIND:=${BUILD_DIR}/src/ausd}"

DATA_DIR="${BUILD_DIR}/ibd"
mkdir -p "${DATA_DIR}"
DEBUG_LOG="${DATA_DIR}/debug.log"

cleanup() {
  # Cleanup background processes spawned by this script.
  pkill -P ${MYPID} tail || true
}
trap "cleanup" EXIT

# Make sure the debug log exists so that tail does not fail
touch "${DEBUG_LOG}"
# Show some progress
tail -f "${DEBUG_LOG}" | grep 'UpdateTip' | awk 'NR % 10000 == 0' &

callback() {
  echo "Initial block download complete."

  # TODO Add more checks to see if IBD completed as expected.
  # These checks will exit the subshell with a non-zero exit code.
}
export -f callback

BITCOIND="${BITCOIND}" \
LOG_FILE="${DEBUG_LOG}" \
"${TOPLEVEL}/contrib/devtools/ausd-exit-on-log.sh" \
  --grep 'Leaving InitialBlockDownload (latching to false)' \
  --params "-datadir=${DATA_DIR} $*" \
  --callback callback
