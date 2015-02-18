#!/bin/bash
#
# Builds ccs-emulator docker image
#
set -e

SCRIPTDIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
docker build -t xdevops/ccs-emulator $SCRIPTDIR
