#!/bin/bash
printenv

# generate initial haproxy.cfg
export PYTHONPATH=$PYTHONPATH:/approot/lda-clientlib/python
python /tmp/haproxygen.py init > /etc/haproxy/haproxy.cfg

# run haproxy
haproxy -f /etc/haproxy/haproxy.cfg -p /var/run/haproxy.pid
echo "haproxy started"

while true; do
    sleep 10s;
    if python /tmp/haproxygen.py regen "$@" > /tmp/haproxy.cfg ; then
        if ! diff /tmp/haproxy.cfg /etc/haproxy/haproxy.cfg >/dev/null ; then
            mv /tmp/haproxy.cfg /etc/haproxy/haproxy.cfg
            haproxy -f /etc/haproxy/haproxy.cfg -p /var/run/haproxy.pid -sf $(cat /var/run/haproxy.pid)
        fi
    fi
done
