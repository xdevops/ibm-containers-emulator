#!/bin/sh
kill `ps aux | grep "python api/app.py" | awk '{ print $2 }' | sort | head -n 1`
kill `ps aux | grep "python api/instancemgr.py" | awk '{ print $2 }' | sort | head -n 1`
exit 0
