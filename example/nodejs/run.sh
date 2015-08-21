#!/bin/bash
#set -x

CCSAPI="http://localhost:5000/v3"

HELLO_IMAGE="hello:v2"
HELLO_ROUTE="localhost:6001"

SCRIPTDIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

#################################################################################
# Build the hello example image
#################################################################################
docker build -t $HELLO_IMAGE $SCRIPTDIR

#################################################################################
# Start the hello example group
#################################################################################
read -d '' hello << EOF
{
    "Name": "hello_example",
    "Memory": 256,
    "Image": "$HELLO_IMAGE",
    "Port": 5000,
    "NumberInstances": { "Desired": 2, "Min": 1, "Max": 3 }
}
EOF
HELLO_ID=$(echo $hello | curl -s -H "Content-Type: application/json" -d @- "${CCSAPI}/containers/groups" | sed -e 's/.*"Id": "\([^"]*\)",.*/\1/')
echo "created hello example group: $HELLO_ID"

#################################################################################
# Map a load-balancer route to the hello example group
#################################################################################
read -d '' binding << EOF
{
    "domain": "$HELLO_ROUTE"
}
EOF
echo $binding | curl -H "Content-Type: application/json" -d @- "${CCSAPI}/containers/groups/${HELLO_ID}/maproute"
echo
echo "bound ${HELLO_ROUTE} to the hello example group"
