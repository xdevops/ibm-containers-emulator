#!/bin/bash
#
# Builds mock_ccsapi docker image
#
set -e

SCRIPTDIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
docker build -t xdevops/mock-ccsapi $SCRIPTDIR

