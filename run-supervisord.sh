#!/bin/bash
printenv
export PYTHONPATH=/mock_ccsapi/api:$PYTHONPATH
/usr/bin/supervisord -n
