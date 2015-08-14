#!/bin/bash
#
# Start (or restart) the ccs-emulator:
#    - ccsapi server on port 5000
#    - ccsrouter ports 6001-6009 (for user application routes)
#
set -e

CCS_EMULATOR_IMAGE="xdevops/ccs-emulator"

SCRIPTDIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
BRIDGE_IP=`ifconfig docker0 | awk '$1 == "inet" && $2 ~/^addr:/ {printf "%s", substr($2, 6)}'`

# shutdown previous emulator if already running
$SCRIPTDIR/shutdown.sh

# build the emulator image
docker build -t $CCS_EMULATOR_IMAGE $SCRIPTDIR

# run the emulator
docker run \
    -d --name ccs-emulator \
    -e DOCKER_REMOTE_HOST="${BRIDGE_IP}:2375" \
    -e CCSAPI_URL="http://localhost:5000/v3/containers" \
    -p 6001-6009:6001-6009 -p 5000:5000 \
    $CCS_EMULATOR_IMAGE
