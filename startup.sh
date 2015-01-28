#!/bin/sh
export PYTHONPATH=./api:$PYTHONPATH
python api/app.py &
python api/instancemgr.py &