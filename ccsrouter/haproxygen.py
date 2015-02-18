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

def generate(servers):
    path = os.path.abspath(__file__)
    dir_path = os.path.dirname(path)
    f = open(dir_path + '/haproxy.cfg.tpl')
    tpl = f.read()
    f.close()
    rslt = tpl.format(servers_6000 = servers[0], 
                      servers_6001 = servers[1],
                      servers_6002 = servers[2],
                      servers_6003 = servers[3],
                      servers_6004 = servers[4],
                      servers_6005 = servers[5],
                      servers_6006 = servers[6],
                      servers_6007 = servers[7],
                      servers_6008 = servers[8],
                      servers_6009 = servers[9])
    print rslt
    
def regen(ccsapi_url):
    logger.info('Regenerating ccsrouter HAProxy configuration. ccsapi_url: %s', ccsapi_url)
    servers = ['','','','','','','','','','']
    groups_url = "{0}/groups".format(ccsapi_url)
    groups = get(groups_url)
    if groups is None:
        logger.info('>>>>>>>>>> failed to get groups: %s', groups_url)
        return 1
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
                        
                    for container in group_details:
                        logger.info('>>>>>>>>>> container %s ip: %s', container["Name"], container["NetworkSettings"]["IpAddress"])
                        ip_address = container["NetworkSettings"]["IpAddress"]
                        if ip_address:
                            server_port = group.get("Port", 80)
                            servers[port-6000] += '    server %s %s:%s check\n' % (container["Name"], ip_address, server_port)
    generate(servers)
    return 0

def init():
    generate(['','','','','','','','','',''])
    return 0

if __name__ == '__main__':
    function=globals()[sys.argv[1]] # argv[1] should be either "init" or "regen"
    sys.exit(function(*sys.argv[2:]))
