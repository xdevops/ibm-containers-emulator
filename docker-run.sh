#!/bin/bash
#
# Starts mock_ccsapi:
#    - ccsapi server on port 5000
#    - ccsrouter port 5101 (for the Pontus/XDO ELB) and ports 6000-6009 (for user system ELBs)
#
# Assumes the xdevops/mock-ccsapi image has alredy been built
#
set -e

BRIDGE_IP=`ifconfig docker0 | awk '$1 == "inet" && $2 ~/^addr:/ {printf "%s", substr($2, 6)}'`

docker run \
    -d --name mock_ccsapi \
    -e DOCKER_REMOTE_HOST="${BRIDGE_IP}:4243" \
    -e CCSAPI_URL="http://localhost:5000/v2.0/containers" \
    -p 6000:6000 -p 6001:6001 -p 6002:6002 -p 6003:6003 -p 6004:6004 -p 6005:6005 -p 6006:6006 -p 6007:6007 -p 6008:6008 -p 6009:6009 \
    -p 5000:5000 \
    xdevops/mock-ccsapi

#    -p 6000-6009:6000-6009 -p 5000:5000 \
#TODO    -p 6000-6009:6000-6009 -p 5101:5101 -p 5000:5000 \
