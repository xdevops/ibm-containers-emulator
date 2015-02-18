#!/bin/bash
printenv
export PYTHONPATH=/ccs-emulator/api:$PYTHONPATH
/usr/bin/supervisord -n
