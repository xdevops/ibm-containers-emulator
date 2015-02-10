#!/bin/sh
sudo kill `ps aux | grep "api/app.py" | awk '{ print $2 }' | sort | head -n 1`
sudo kill `ps aux | grep "api/instancemgr.py" | awk '{ print $2 }' | sort | head -n 1`
exit 0
