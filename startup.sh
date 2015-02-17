#!/bin/bash
#
# Starts mock_ccsapi:
#    - ccsapi server on port 5000
#    - ccsrouter port 5101 (for the Pontus/XDO ELB) and ports 6000-6009 (for user system ELBs)
#
set -e

SCRIPTDIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
$SCRIPTDIR/docker-build.sh
$SCRIPTDIR/docker-run.sh
