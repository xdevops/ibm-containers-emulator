"""
FORMAT: 1A
# Licensed Materials - Property of IBM
#(C) Copyright IBM Corp. 2014 All Rights Reserved
# US Government Users Restricted Rights - Use, duplication or disclosure
# restricted by GSA ADP Schedule Contract with IBM Corp
# Container Cloud API

This document describes an API for the Docker Container Cloud based as a subset of the Docker Remote API.
We use [API Blueprint](http://apiblueprint.org/) for formatting and describing the proposed API.

"""
import os, requests, json
from flask import Flask, request
#from flask.ext.cors import CORS
from string import Template
from groupstore import FileGroupStore
from instancemgr import DOCKER_REMOTE_HOST, delete_instances, get_group_instances
import logging
import sys
import requests


"""
Problems and Incompatibilities

1. When should get_container_state return "Suspended"
2. note incompatible IPAddress -> IpAddress
3. note Name field has no leading '/' character as in docker

Extensions to current CCSAPI: Talk to Dave ???

GET   /{version}/containers/new (launch wizard screen for containers and groups)
"""

APP_NAME=os.environ['APP_NAME'] if 'APP_NAME' in os.environ else 'ccs'
GROUP_STORE=FileGroupStore(False)
# Only reset the GROUP_STORE if we determine it is out of sync with the current docker instances
for group in GROUP_STORE.list_groups():
    if len(get_group_instances(group)) < group["NumberInstances"]["Min"]:
        GROUP_STORE.reset()
        break

HTML_TEMPLATE=\
'''
<!DOCTYPE html>
<html lang="en">
<head>
    <link rel="stylesheet" href="//ace-common-dev.ng.bluemix.net/api/v1/css/common.css">
    <link rel="stylesheet" href="//ace-common-dev.ng.bluemix.net/api/v1/css/header.css">

    <meta charset="UTF-8">
    <title></title>
</head>
<body>
    <div id="spa" style="display:none">
        <span id="ace_config">
            $ace_config
        </span>
        <span id="payload" resource-type="$resource_type" resource-url="$resource_url" auth-token="$auth_token">
            $json
        </span>
    </div>

    <script src="/$app_name/application.js" type="text/javascript"></script>
</body>
</html>
'''

def parse_ace_config():
    ace_config_string = request.args.get('ace_config')
    if ace_config_string is None:
        ace_config_string = "{}"

    return ace_config_string

def get_response_text(status_code, response_json, resource_type):
    auth_token = request.headers.get('X-Auth-Token')
    if auth_token is None:
        auth_token = 'NO.TOKEN_FOR.GUI'

    resource_url = request.url.split('?')[0]
    best = request.accept_mimetypes.best_match(['application/json', 'text/html'])
    if best == 'application/json' or status_code != 200:
        return response_json, status_code
    else:
        ace_config = parse_ace_config()
        return Template(HTML_TEMPLATE).substitute(app_name=APP_NAME, json=response_json, resource_type=resource_type, resource_url=resource_url, auth_token = auth_token, ace_config = ace_config), status_code

def get_docker_url():
    path = request.full_path[:-1] if request.full_path[-1] == '?' else request.full_path
    path_segments = path.split('/')
    if path_segments[3] == 'images':
        docker_path = '/'.join(path_segments[3:])   # /<v>/containers/images/xxx -> /containers/images/xxx
    else:
        docker_path = '/'.join(path_segments[2:]) # /<v>/containers/xxx -> /containers/xxx
    return 'http://%s/%s' % (DOCKER_REMOTE_HOST, docker_path)

#######################################################################################################################
# TEMPORARY floating-ips kludge (will be removed when we get proper ccsapi ELBs)
#######################################################################################################################
NUM_HOST_PORTS = 9
AVAILABLE_HOST_PORTS = [ True, True, True, True, True, True, True, True, True ]
FIRST_HOST_PORT = 6001

def get_container_state(container_json):
    # Return one of: 'Running' | 'NOSTATE' | 'Shutdown' | 'Crashed' | 'Paused' | 'Suspended'
    #    Note: 'Suspended' is a Nova state that will never happen (should probably remove from ccs api)
    if container_json["State"].get("Paused"):
        return "Paused"
    if not container_json["State"].get("Restarting"):
        if container_json["State"].get("Running"):
            return "Running"
        if container_json["State"].get("OOMKilled"): # Out Of Memory"
            return "Crashed"
        if container_json["State"].get("ExitCode") and container_json["State"].get("Error"):
            return "Crashed"
        else:
            return "Shutdown"
    return "NOSTATE"

def filter_for_group(name_or_id, containers):
    group = GROUP_STORE.get_group(name_or_id)
    if not group:
        app.logger.warning("get_group_containers failed, no group with name or id {0}".format(name_or_id))
        return "No such group name or id {0}".format(name_or_id), 404
    group_prefix = group["Name"] + '_'
    group_containers = []
    for container in containers:
        if container["Name"].startswith(group_prefix):
            group_containers.append(container)
    return group_containers, 200

def add_group(container_json):
    groups = GROUP_STORE.list_groups()
    for g in groups:
        group_prefix = g["Name"] + '_'
        n = container_json["Name"][1:] if container_json["Name"].startswith("/") else container_json["Name"]
        if n.startswith(group_prefix):
            container_json["Group"] = { "Name": g["Name"], "Id": g["Id"] }
            return

def fixup_containers_response(containers_json):
    for container in containers_json:
        container_url = 'http://%s/containers/%s/json' % (DOCKER_REMOTE_HOST, container["Id"])
        r = requests.get(container_url, headers={'Accept': 'application/json'})
        if r.status_code != 200:
            return r.status_code, r.text
        container_json = r.json()

        # The following properties are ccsapi extensions
        container["ImageId"] = container_json["Image"]
        container["Name"] = container_json["Name"][1:] if container_json["Name"].startswith("/") else container_json["Name"]
        container["NetworkSettings"] = {}
        container["NetworkSettings"]["IpAddress"] = container_json["NetworkSettings"]["IPAddress"]
        container["NetworkSettings"]["PublicIpAddress"] = ""
        container["ContainerState"] = get_container_state(container_json)
        add_group(container)
        # Skipping the following because I don't know what they are or where to find their values:
        # container["SizeRootFs"]
        # container["SizeRw"]

    return 200, containers_json

def fixup_container_info_response(container_json):
    # The following properties are ccsapi extensions
    container_json["ContainerState"] = get_container_state(container_json)
    container_json["NetworkSettings"]["IpAddress"] = container_json["NetworkSettings"]["IPAddress"]

    add_group(container_json)

    return 200, container_json

def fixup_images_response(images_json):
    app.logger.debug("REACHED fixup_images_response, images_json={0}".format(images_json))

    for image in images_json:
        app.logger.warn("in fixup_images_response converting {0}".format(image))

        # The following properties are ccsapi extensions
        if 'Image' not in image:
            image['Image'] = image['RepoTags'][0]

    return 200, images_json

# init the flask app
app = Flask(__name__, static_folder=APP_NAME)
app.config['PROPAGATE_EXCEPTIONS'] = True
app.config['CORS_HEADERS'] = 'Content-Type'
#cors = CORS(app, allow_headers='Content-Type')


### Launch Wizard route

@app.route('/<v>/containers/new', methods=['GET'])
def get_launch_wizard(v):
    response_json = {}
    return get_response_text(200, json.dumps(response_json), 'new')

### Supporting routes
@app.route('/<v>/header', methods=['GET'])
def get_globalnav_header(v):
    header_url = "https://ace-common-dev.ng.bluemix.net/api/v1/header?selection=dashboard"
    r = requests.get(header_url)
    return r.text

"""
## POST /{version}/containers/tokens
"""
@app.route('/<v>/containers/tokens', methods=['POST'])
def get_token(v):
    return "TODO", 200

#"""
### GET /{version}/containers/gettoken{?tenant=$OS_TENANT_NAME&user=$OS_USERNAME&password=$OS_PASSWORD}
#"""
# TODO old format, remove!
# this is just to preserve the old scripts.
# This needs to be removed
#@app.route('/<v>/containers/gettoken', methods=['GET'])
#def get_old_token(v):
#    return ...

"""
## GET /{version}/containers/json{?all,limit,size}
"""
@app.route('/<v>/containers/json', methods=['GET'])
#@token_required
def get_running_containers(v):
    r = requests.get(get_docker_url(), headers={'Accept': 'application/json'})
    if r.status_code != 200:
        status_code = r.status_code
        response_json_string = r.text
    else:
        status_code, containers = fixup_containers_response(r.json())
        if status_code != 200:
            response_json_string = containers
        else:
            group_name_or_id = request.args.get('group')
            if group_name_or_id:
                containers, status_code = filter_for_group(group_name_or_id, containers)
            if status_code != 200:
                response_json_string = containers
            else:
                response_json_string = json.dumps(containers)
    return get_response_text(status_code, response_json_string, 'containers')

"""
## POST /{version}/containers/create{?name}
"""
@app.route('/<v>/containers/create', methods=['POST'])
#@token_required
def create_and_start_container(v):
    app.logger.debug("in create_and_start_container, request.data={0}".format(request.data))

    create_and_start_data = json.loads(request.data)

    if create_and_start_data['Memory'] == 256:
        app.logger.debug("create_and_start_container overriding memory default")
        create_and_start_data['Memory'] = 0

    # This is something of a hack; it is a work-around for a hack Alaa did
    # of always injecting a host if not specified...
    if create_and_start_data['Image'].startswith('registry-ice.ng.bluemix.net/'):
        create_and_start_data['Image'] = create_and_start_data['Image'][28:]    # 28 is how long the prefix we are stripping is

    r = requests.post(get_docker_url(), headers=request.headers, data=json.dumps(create_and_start_data))
    if r.status_code != 201:
        app.logger.error("FAILED to create container in create_and_start_container: {0}".format(r.text))
        app.logger.error("Request was: {0}".format(r.text))
        return r.text, r.status_code

    app.logger.info("Created container in create_and_start_container")
    response = json.loads(r.text)
    app.logger.warn("create_and_start_container, Docker's response={0}".format(response))

    # Fix up incompatibilities
    if 'Warnings' in response and response['Warnings'] == None:
        response['Warnings'] = []

    # CCSAPI now must also call /containers/{id}/start
    start_data = {}

    # TEMPORARY kludge for elb
    global AVAILABLE_HOST_PORTS # if this was for more than just a localhost test environment, you would want to protect this with a lock and store the allocation table in a shared DB
    if "Env" in create_and_start_data and create_and_start_data["Env"]:
        for var in create_and_start_data["Env"]:
            nv = var.split('=')
            if nv[0] == 'MOCK_ELB_PUBLIC_DOMAIN_NAME':
                host_port = nv[1][len('localhost:'):]
                port_index = int(host_port)-FIRST_HOST_PORT
                if not AVAILABLE_HOST_PORTS[port_index]:
                    return "Host port {0} is already allocated".format(host_port), 400
                AVAILABLE_HOST_PORTS[port_index] = False
                start_data = '{"PortBindings": { "80/tcp": [{ "HostPort": "%s" }] }}' % host_port
                break

    r = requests.post('http://%s/containers/%s/start' % (DOCKER_REMOTE_HOST, response['Id']), headers=request.headers, data=start_data)
    if r.status_code != 204:
        return r.text, r.status_code

    return json.dumps(response), 201

"""
## GET /{version}/containers/{id}/json
"""
@app.route('/<v>/containers/<id>/json', methods=['GET'])
#@token_required
def show_container_info(v,id):
    r = requests.get(get_docker_url(), headers={'Accept': 'application/json'})
    container = r.json()
    status_code, response_json = fixup_container_info_response(container) if r.status_code == 200 else (r.status_code, r.text)
    return get_response_text(status_code, json.dumps(response_json), 'container')

"""
## POST /{version}/containers/{id}/start
"""
@app.route('/<v>/containers/<id>/start', methods=['POST'])
#@token_required
def start_container(v,id):
    r = requests.post(get_docker_url(), headers=request.headers, data=request.data)
    return r.text, r.status_code

"""
## POST /{version}/containers/{id}/stop{?t}
"""
@app.route('/<v>/containers/<id>/stop', methods=['POST'])
#@token_required
def stop_container(v,id):
    r = requests.post(get_docker_url(), headers=request.headers, data=request.data)
    return r.text, r.status_code

"""
## POST /{version}/containers/{id}/restart{?t}
"""
@app.route('/<v>/containers/<id>/restart', methods=['POST'])
#@token_required
def restart_container(v,id):
    r = requests.post(get_docker_url(), headers=request.headers, data=request.data)
    return r.text, r.status_code

"""
## POST /{version}/containers/{id}/pause
"""
@app.route('/<v>/containers/<id>/pause', methods=['POST'])
#@token_required
def pause_container(v,id):
    r = requests.post(get_docker_url(), headers=request.headers, data=request.data)
    return r.text, r.status_code

"""
## POST /{version}/containers/{id}/unpause
"""
@app.route('/<v>/containers/<id>/unpause', methods=['POST'])
#@token_required
def unpause_container(v,id):
    r = requests.post(get_docker_url(), headers=request.headers, data=request.data)
    return r.text, r.status_code

"""
## GET /{version}/containers/{id}/logs{?stdout}
"""
@app.route('/<v>/containers/<id>/logs', methods=['GET'])
#@token_required
def get_logs(v,id):
    # TODO look at ice's request to see if the streams were specified there (how?)
    r = requests.get(get_docker_url(), headers={'Accept': 'application/json'},
                     params={'stderr': 1, 'stdout': 1})

    if r.status_code != 200:
        app.logger.warn("Docker returned {0}: {1}".format(r.status_code, r.text))

    return get_response_text(r.status_code, r.text, 'logs')

"""
## DELETE /{version}/containers/{id}
"""
@app.route('/<v>/containers/<id>', methods=['DELETE'])
#@token_required
def delete_container(v,id):
    #TODO: first call /containers/{id}/kill
    r = requests.delete(get_docker_url(), headers=request.headers)
    return r.text, r.status_code

"""
## POST /{version}/containers/images/register
"""
@app.route('/<v>/containers/images/register', methods=['POST'])
#@token_required
def register_image(v):
    #TODO: this isn't right ... no corresponding Docker API
    r = requests.post(get_docker_url(), headers=request.headers, data=request.data)
    return r.text, r.status_code

"""
## GET /{version}/containers/images/json
"""
@app.route('/<v>/containers/images/json', methods=['GET'])
#@token_required
def get_images(v):
    # TODO Something is wrong, I am only seeing two images in the response
    # from the next line...
    r = requests.get(get_docker_url(), headers={'Accept': 'application/json'})
    status_code, response_json = fixup_images_response(r.json()) if r.status_code == 200 else (r.status_code, r.text)
    return get_response_text(status_code, json.dumps(response_json), 'images')

"""
## PUT /{version}/containers/images/<id>
"""
@app.route('/<v>/containers/images/<id>', methods=['PUT'])
#@token_required
def update_image_registration(v,id):
   #TODO: how to implement ... no corresponding Docker API
   return "", 201

"""
## DELETE /{version}/containers/images/<id>
"""
@app.route('/<v>/containers/images/<id>', methods=['DELETE'])
#@token_required
def unregister_image(v,id):
    #TODO: this isn't right ... Docker API expects image name (not <id>)
    r = requests.delete(get_docker_url(), headers=request.headers)
    return r.text, r.status_code

"""
## POST /{version}/containers/build
"""
@app.route('/<v>/containers/build', methods=['POST'])
#@token_required
def build_image(v):
    return "TODO", 201

"""
## GET /{version}/containers/floating-ips{?all}
"""
@app.route('/<v>/containers/floating-ips', methods=['GET'])
#@token_required
def get_floating_ips(v):
    global AVAILABLE_HOST_PORTS # if this was for more than just a localhost test environment, you would want to protect this with a lock and store the allocation table in a shared DB
    response = []
    for i in range(0, NUM_HOST_PORTS):
        if AVAILABLE_HOST_PORTS[i]:
            host_port = FIRST_HOST_PORT + i
            response.append({ "Bindings": None, "IpAddress": "localhost:%s" % host_port })
    return json.dumps(response), 200

"""
## POST /{version}/containers/{id}/floating-ips/{ip}/bind
"""
@app.route('/<v>/containers/<id>/floating-ips/<ip>/bind', methods=['POST'])
#@token_required
def set_floating_ips(v,id, ip):
    return "", 204

"""
## POST /{version}/containers/{id}/floating-ips/{ip}/unbind
"""
@app.route('/<v>/containers/<id>/floating-ips/<ip>/unbind', methods=['POST'])
#@token_required
def unset_floating_ips(v,id, ip):
    return "", 204

"""
## POST /{version}/containers/floating-ips/request
"""
@app.route('/<v>/containers/floating-ips/request', methods=['POST'])
# @token_required
def request_floating_ips(v):
    # creds,msg = parse_token_for_creds(request.headers)
    # if creds == None:
    #     return INVALID_TOKEN_FORMAT + msg,401
    return "Not implemented", 501

"""
## POST /{version}/containers/floating-ips/{ip}/release
"""
@app.route('/<v>/containers/floating-ips/<ip>/release', methods=['POST'])
#@token_required
def release_floating_ips(v,ip):
    global AVAILABLE_HOST_PORTS # if this was for more than just a localhost test environment, you would want to protect this with a lock and store the allocation table in a shared DB
    if ip.startswith("localhost:"):
        host_port = int(ip[len("localhost:"):])
        AVAILABLE_HOST_PORTS[host_port - FIRST_HOST_PORT] = True
    return "", 204

"""
## GET /{version}/containers/groups
"""
@app.route('/<v>/containers/groups', methods=['GET'])
#@token_required
def list_groups(v):
    groups = GROUP_STORE.list_groups()
    return get_response_text(200, json.dumps(groups), 'groups')

"""
## POST /{version}/containers/groups
"""
@app.route('/<v>/containers/groups', methods=['POST'])
#@token_required
def create_group(v):
    group = json.loads(request.data)
    if "Name" not in group:
        return "Bad parameter", 400
    for g in GROUP_STORE.list_groups():
        if g["Name"] == group["Name"]:
            return "Scaling group with that name already exists", 409

    group_id = GROUP_STORE.put_group(group)
    response = {"Id": group_id, "Warnings":[]}
    return json.dumps(response), 201

#"""
### POST /{version}/containers/groups/create
#
#DEPRICATED - replaced by
# POST /{version}/containers/groups method
#"""
#@app.route('/<v>/containers/groups/create', methods=['POST'])
#@token_required
#def create_group_DEPRICATED(v):
#    return create_group(v)

"""
## PATCH /{version}/containers/groups/{name_or_id}
"""
@app.route('/<v>/containers/groups/<name_or_id>', methods=['PATCH'])
#@token_required
def update_group(v, name_or_id):
    print "update_group data: %s" % request.data
    new_group = json.loads(request.data)
    group = GROUP_STORE.get_group(name_or_id)
    if not group:
        return "Not found", 404
    if "Id" in new_group and new_group["Id"] != group["Id"]:
        return "Invalid Id property", 400
    if "Name" in new_group and new_group["Name"] != group["Name"]:
        return "Group name cannot be changed", 400
    group.update(new_group)
    if "NumberInstances" not in group or \
       "Desired" not in group["NumberInstances"] or \
       "Min" not in group["NumberInstances"] or \
       "Max" not in group["NumberInstances"] or \
       int(group["NumberInstances"]["Desired"]) < group["NumberInstances"]["Min"] or \
       int(group["NumberInstances"]["Desired"]) > group["NumberInstances"]["Max"]:
        return "Invalid NumberInstances property", 400
    GROUP_STORE.put_group(group)
    return "", 204

"""
## GET /{version}/containers/groups/{name_or_id}
"""
@app.route('/<v>/containers/groups/<name_or_id>', methods=['GET'])
#@token_required
def get_group_info(v, name_or_id):
    group = GROUP_STORE.get_group(name_or_id)
    if not group:
        app.logger.warning("get_group_info failed, no group with name or id {0}".format(name_or_id))
        return "No such name or id {0}".format(name_or_id), 404
    return get_response_text(200, json.dumps(group), 'group')

#"""
### GET /{version}/containers/groups/{name_or_id}/containers
#"""
# moved to /containers/json

#"""
### GET /{version}/containers/groups/{id}/floating-ips
#"""
# TODO this method will be removed when Lin validates equivalent routercalls_util method works

"""
## DELETE /{version}/containers/groups/{name_or_id}
"""
@app.route('/<v>/containers/groups/<name_or_id>', methods=['DELETE'])
#@token_required
def delete_group(v, name_or_id):
    group = GROUP_STORE.get_group(name_or_id)
    if not group:
        return "Not found", 404
    delete_instances(name_or_id)
    GROUP_STORE.delete_group(group)
    return "", 204

"""
## POST /{version}/containers/groups/<name_or_id>/maproute
"""
@app.route('/<v>/containers/groups/<name_or_id>/maproute', methods=['POST'])
#@token_required
def maproute_containers_group(v, name_or_id):
    return "TODO", 201

"""
## POST /{version}/containers/groups/<name_or_id>/unmaproute
"""
@app.route('/<v>/containers/groups/<name_or_id>/unmaproute', methods=['POST'])
#@token_required
def unmap_route_containers_group(v, name_or_id):
    return "TODO", 201

"""
## GET /{version}/containers/usage
"""
@app.route('/<v>/containers/usage', methods=['GET'])
#@token_required
def get_limits(v):
    # creds,msg = parse_token_for_creds(request.headers)
    # if creds == None:
    #     return INVALID_TOKEN_FORMAT + msg,401

    running_containers = 0
    r = requests.get('http://{0}/containers/json'.format(DOCKER_REMOTE_HOST),
                     headers={'Accept': 'application/json'})
    if r.status_code == 200:
        running_containers = len(r.json())
    else:
        app.logger.warn("Couldn't get containers list from Docker; {0}: {1}".format(r.status_code, r.text))

    # TODO get real VPU values from Docker instead of assuming each container 1 VCPU and 256 MB
    result = {
        # the current runtime usage
        "Usage": {
            "vcpu": running_containers,
            "memory_MB": 256 * running_containers,
            "running": running_containers,
            "floating_ips": 0,
            "containers": running_containers
        },
        # This is the quota.  TODO Why are the usage figures and flavor values numbers and the quota strings!?!
        "Limits": {
            "vcpu": "100",
            "memory_MB": "25600",
            "floating_ips": "24",
            "containers": "100"
        },
        # These are the flavors
        "AvailableSizes": [
            {"memory_MB": 256, "vcpus": 1, "disk": 1,  "name": "m1.tiny"},
            {"memory_MB": 512, "vcpus": 2, "disk": 2,  "name": "m1.small"},
            {"memory_MB": 1024,"vcpus": 4, "disk": 10, "name": "m1.medium"},
            {"memory_MB": 2048,"vcpus": 8, "disk": 10, "name": "m1.large"}
        ]
    };

    return json.dumps(result), 200

"""
## PUT /{version}/registry/namespaces/<namespace>
"""
@app.route('/v2/registry/namespaces/<namespace>', methods=['PUT'])
#@token_required
def create_or_update_namespace(namespace):
    return "TODO", 200

"""
## GET /{version}/registry/namespaces/<namespace>
"""
@app.route('/v2/registry/namespaces/<namespace>', methods=['GET'])
#@token_required
def get_namespace_by_name(namespace):
    return "TODO", 200

"""
## GET /{version}/registry/namespaces
"""
@app.route('/v2/registry/namespaces', methods=['GET'])
#@token_required
def get_user_service_namespace():
    return "TODO", 200

"""
## DELETE /{version}/registry/namespaces
"""
@app.route('/v2/registry/namespaces', methods=['DELETE'])
#@token_required
def delete_namespace():
    return "TODO", 204


### Start up code
if __name__ == '__main__':
    # TODO Why doesn't the following add console logging?
    handler = logging.StreamHandler(sys.stderr)
    handler.setLevel(logging.DEBUG) # TODO I can't seem to see output below WARN level...
    app.logger.addHandler(handler)

    app.run(host='0.0.0.0')
else:
    application = app
