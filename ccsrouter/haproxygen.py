#!/usr/bin/python

# Licensed Materials - Property of IBM
# (C) Copyright IBM Corp. 2015. All Rights Reserved.
# US Government Users Restricted Rights - Use, duplication or
# disclosure restricted by GSA ADP Schedule Contract with IBM Corp.

import os, sys, requests
import logging
FORMAT = '[%(levelname)s:%(asctime)-15s] --- %(message)s [%(filename)s:%(funcName)s:%(lineno)d]' 
logging.basicConfig(level=logging.INFO, format=FORMAT)

logger=logging.getLogger(__name__)

CONFIG_TPL = \
"""
global
    daemon
    maxconn 256
    pidfile /var/run/haproxy-private.pid

defaults
    mode http
    balance roundrobin
    option http-server-close
    retries 2
    timeout connect 1000ms
    timeout client 50000ms
    timeout server 50000ms

listen admin
    bind *:8080
    stats enable

{routes}
"""

ROUTE_TPL = \
"""
frontend route_{port}
    bind *:{port}
    default_backend default.route_{port}

backend default.route_{port}
{servers}
"""

def get(request_url):
    try:
        r = requests.get(request_url, headers={'Accept': 'application/json'})
    except:
        logger.info('Failed to GET %s', request_url)
        return None
    if r.status_code != 200:
        logger.info('Failed to GET %s, status_code: %s', request_url, r.status_code)
        return None    
    else:
        logger.info('Successful GET of %s', request_url)        
    return r.json()

def regen(ccsapi_url):
    logger.info('Regenerating ccsrouter HAProxy configuration. ccsapi_url: %s', ccsapi_url)
    groups_url = "{0}/groups".format(ccsapi_url)
    groups = get(groups_url)
    if groups is None:
        logger.info('>>>>>>>>>> failed to get groups: %s', groups_url)
        return 1
    routes = ''
    for group in groups:
        if group.get("Routes"):
            for route in group["Routes"]:
                host, port = route.split(':')
                port = int(port)
                if host == 'localhost' and port >= 6000 and port <= 6009:
                    logger.info('>>>>>>>>>> group id: %s', group["Id"])
                    group_url = "{0}/json?group={1}".format(ccsapi_url, group["Id"])
                    group_details = get(group_url)
                    if group_details is None:
                        logger.info('>>>>>>>>>> failed to get group: %s', group_url)
                        return 1
                    if len(group_details) == 0:
                        logger.info('>>>>>>>>>> group: {0} has no container instances'.format(group_url))
                    servers = ''   
                    for container in group_details:
                        logger.info('>>>>>>>>>> container %s ip: %s', container["Name"], container["NetworkSettings"]["IpAddress"])
                        ip_address = container["NetworkSettings"]["IpAddress"]
                        if ip_address:
                            server_port = group.get("Port", 80)
                            servers += '    server %s %s:%s check\n' % (container["Name"], ip_address, server_port)
                    if servers:
                        routes += ROUTE_TPL.format(port=port, servers=servers)
    print CONFIG_TPL.format(routes=routes)
    return 0

def init():
    print CONFIG_TPL.format(routes='')
    return 0

if __name__ == '__main__':
    function=globals()[sys.argv[1]] # argv[1] should be either "init" or "regen"
    sys.exit(function(*sys.argv[2:]))
