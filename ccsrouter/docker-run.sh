BRIDGE_IP=`ifconfig docker0 | awk '$1 == "inet" && $2 ~/^addr:/ {printf "%s", substr($2, 6)}'`
CCSAPI_URL="http://${BRIDGE_IP}:5000/v2.0/containers"
docker run -d -p 6000-6009:6000-6009 --name router --env CCSAPI_URL="$CCSAPI_URL" xdevops/ccsrouter
