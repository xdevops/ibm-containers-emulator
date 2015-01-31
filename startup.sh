#!/bin/sh
export PYTHONPATH=./api:$PYTHONPATH
python api/app.py >app_stdout.log 2>app_stderr.log &
python api/instancemgr.py >instancemgr_stdout.log 2>instancemgr_stderr.log &