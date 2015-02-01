#!/bin/sh
kill `ps aux | grep "api/app.py" | awk '{ print $2 }' | sort | head -n 1` 2> /dev/null
kill `ps aux | grep "api/instancemgr.py" | awk '{ print $2 }' | sort | head -n 1` 2> /dev/null
exit 0
