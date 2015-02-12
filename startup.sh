#!/bin/bash

readonly DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Show the running command
set -x

export PYTHONPATH=$DIR/api:$PYTHONPATH
python $DIR/api/app.py > $DIR/app_stdout.log 2> $DIR/app_stderr.log &
python $DIR/api/instancemgr.py > $DIR/instancemgr_stdout.log 2> $DIR/instancemgr_stderr.log &