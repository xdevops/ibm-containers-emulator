#!/bin/sh

# Show the running command
set -x

# TODO because this sorts it fails when the PIDs wrap around
kill `ps aux | grep "api/app.py" | awk '{ print $2 }' | sort | head -n 1`
kill `ps aux | grep "api/instancemgr.py" | awk '{ print $2 }' | sort | head -n 1`

exit 0
