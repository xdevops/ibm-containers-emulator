"""
FORMAT: 1A
# Licensed Materials - Property of IBM
#(C) Copyright IBM Corp. 2014 All Rights Reserved
# US Government Users Restricted Rights - Use, duplication or disclosure
# restricted by GSA ADP Schedule Contract with IBM Corp
# Container Cloud API

A simple file system based floating ip binding store.
"""

import os
import json
import logging

logging.basicConfig(format='%(asctime)s:%(levelname)s:%(threadName)s:%(message)s')
logger = logging.getLogger(__name__)
# logger.setLevel(logging.INFO)
logger.setLevel(logging.DEBUG)

STORE_FILE_NAME = 'bindings.json'

#######################################################################################################################
# TEMPORARY floating-ips kludge (will be removed when we get proper ccsapi ELBs)
#######################################################################################################################
NUM_HOST_PORTS = 9
AVAILABLE_HOST_PORTS = [ True ] * NUM_HOST_PORTS
FIRST_HOST_PORT = 6001


class FileBindingStore():
    def __init__(self, cleanup, store_dir=None):
        if not store_dir:
            path = os.path.abspath(__file__)
            dir_path = os.path.dirname(path)
            store_dir = dir_path # + '/' + DEFAULT_STORE_DIR
        self.store_dir = store_dir
        if cleanup:
            self.reset()
        self.get()
        
    def reset(self):
        os.remove(self.store_dir + os.sep + STORE_FILE_NAME)

    def get_free_ips(self):
        """ Get a list of ports that are available"""
        return [idx + FIRST_HOST_PORT for idx, val in enumerate(AVAILABLE_HOST_PORTS) if val]
    
    def bind(self, ip, id):
        """Pretend to associate an IP address (actually localhost:PORT) with a container.  (Actually see if we already grabbed it.)
        @param id: string
        @param ip: string
        """

        port = int(ip[len('localhost:'):])
        
        if self.container_to_port.get(id) != port:
            logger.debug("mock-bind failing because container_to_port {0} maps to {1} not {2} [{3}]".format(id, self.container_to_port.get(id), port, ip))
            
        return self.container_to_port.get(id) == port
    
    def unbind(self, ip, id):
        """Unassociate an IP address (actually IP:PORT) with a container
        @param id: string
        @param ip: string
        """
        port = int(ip[len('localhost:'):])
        if self.container_to_port.get(id) != port:
            logger.warn("mock-bind cannot remove floating-ip {0} from {1}.  Actual binding: ".format(ip, id, self.container_to_port.get(id)))
            return False
        
        self.container_to_port.pop(id, None)
        self.container_to_name.pop(id, None)
        self.port_to_container.pop(port, None)
        AVAILABLE_HOST_PORTS[port - FIRST_HOST_PORT] = True
        logger.info("mock-bind removed floating-ip {0} from {1}".format(ip, id))
        
        self.put()
        
        return True
    
    def remove_bindings(self, name_or_id):
        if self.container_to_port.get(name_or_id):
            logger.debug("mock-bind removing floating-ip bindings for {0}".format(name_or_id))
            self.unbind("localhost:{0}".format(self.container_to_port.get(name_or_id)), name_or_id)
            return
        
        # Maybe we were supplied a name instead of an id
        id = next((id for id, name in self.container_to_name.items() if name==name_or_id), None)
        if id and self.container_to_port.get(id):
            logger.debug("mock-bind removing floating-ip bindings {1} for {0}".format(id, self.container_to_port.get(id)))
            self.unbind("localhost:{0}".format(self.container_to_port.get(id)), id)
    
    def grab(self, port):
        """Get a free port
        
        @param request: int a TCP port number
        """
        
        if port < FIRST_HOST_PORT or port-FIRST_HOST_PORT >= len(AVAILABLE_HOST_PORTS):
            return False
        
        AVAILABLE_HOST_PORTS[port-FIRST_HOST_PORT] = False
        
        self.put()
        
        return True
    
    def associate_grabbed_ip(self, id, port, instancename):
        self.port_to_container[port] = id
        self.container_to_port[id] = port
        self.container_to_name[id] = instancename
        
        self.put()
        
        return True

    def put(self):
        file_path = self.store_dir + os.sep + STORE_FILE_NAME
        with open(file_path, 'w') as bindings_file:
            bindings = {'available_host_ports': AVAILABLE_HOST_PORTS,
                        'port_to_container': self.port_to_container,
                        'container_to_port': self.container_to_port,
                        'container_to_name': self.container_to_name}
            json.dump(bindings, bindings_file)
            
    def get(self):
        global AVAILABLE_HOST_PORTS
        file_path = self.store_dir + os.sep + STORE_FILE_NAME
        try:
            with open(file_path) as bindings_file:    
                bindings = json.load(bindings_file)
                logger.info("reloaded bindings {0}".format(bindings))
                AVAILABLE_HOST_PORTS = bindings['available_host_ports']
                self.port_to_container = bindings['port_to_container']
                self.container_to_port = bindings['container_to_port']
                self.container_to_name = bindings['container_to_name']
        except:
            logger.info("No bindings file {0}, recreating".format(file_path))
            self.port_to_container = {}
            self.container_to_port = {}
            self.container_to_name = {}
            AVAILABLE_HOST_PORTS = [ True ] * NUM_HOST_PORTS

