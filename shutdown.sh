#!/bin/bash
#
# Stop ccs-emulator
#
docker kill ccs-emulator 2>/dev/null
docker rm ccs-emulator 2>/dev/null
exit 0
