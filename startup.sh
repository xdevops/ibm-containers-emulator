#!/bin/bash
#
# Starts ccs-emulator:
#    - ccsapi server on port 5000
#    - ccsrouter ports 6000-6009 (for user system ELBs)
#
set -e

SCRIPTDIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
$SCRIPTDIR/docker-build.sh
$SCRIPTDIR/docker-run.sh
