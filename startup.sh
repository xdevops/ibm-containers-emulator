#!/bin/bash
#
# Starts mock_ccsapi:
#    - ccsapi server on port 5000
#    - ccsrouter port 5101 (for the Pontus/XDO ELB) and ports 6000-6009 (for user system ELBs)
#
set -e

SCRIPTDIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
docker build -t xdevops/mock-ccsapi $SCRIPTDIR

BRIDGE_IP=`ifconfig docker0 | awk '$1 == "inet" && $2 ~/^addr:/ {printf "%s", substr($2, 6)}'`

docker run \
    -d --name mock_ccsapi \
    -e DOCKER_REMOTE_HOST="${BRIDGE_IP}:4243" \
    -e CCSAPI_URL="http://localhost:5000/v2.0/containers" \
    -p 6000-6009:6000-6009 -p 5000:5000 \
    xdevops/mock-ccsapi

#TODO    -p 6000-6009:6000-6009 -p 5101:5101 -p 5000:5000 \
