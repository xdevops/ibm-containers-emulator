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
from flask import Flask, request, Response
from string import Template
from groupstore import FileGroupStore
from instancemgr import DOCKER_REMOTE_HOST, delete_instances, get_group_instances

"""
CCS API                                                     Docker API
-------------------------------------------------------     ------------------------------------------------------------------------------------
GET    /{version}/containers/json{?all,limit,size}          /containers/json
POST   /{version}/containers/create{?name}                  /containers/create (also POST /containers/{id}/start)
POST   /{version}/containers/{id}/start                     /containers/{id}/start
GET    /{version}/containers/{id}/json                      /containers/(id)/json
GET    /{version}/containers/{id}/logs{?stdout,stderr}      /containers/(id)/logs
POST   /{version}/containers/{id}/stop{?t}                  /containers/(id)/stop
POST   /{version}/containers/{id}/restart{?t}               /containers/(id)/restart
POST   /{version}/containers/{id}/pause                     /containers/(id)/pause
POST   /{version}/containers/{id}/unpause                   /containers/(id)/unpause
DELETE /{version}/containers/{id}                           /containers/(id) (The container is first killed by default ???)

POST   /{version}/containers/images/register                ???
GET    /{version}/containers/images                         /images/json
PUT    /{version}/containers/images/<id>                    ???
DELETE /{version}/containers/images/<id>                    /images/(name) (note id vs name ???)

The following have no corresponding Docker implementation

POST   /{version}/containers/tokens

GET    /{version}/containers/floating-ips{?all}
POST   /{version}/containers/{id}/floating-ips/{ip}/bind
POST   /{version}/containers/{id}/floating-ips/{ip}/unbind

GET    /{version}/containers/groups
POST   /{version}/containers/groups/create
PUT    /{version}/containers/groups/{id}
DELETE /{version}/containers/groups/{id}
GET    /{version}/containers/groups/{id}/health

Problems and Incompatibilities

1. Missing Names field
2. Status field value from Docker is being overwritten
4. When should get_container_status return "Suspended"
5. get_container_status Exited (0) currently returning NOSTATE ... should this be Shutdown?
6. extensions - see fixup_containers_response
7. note incompatible IPAddress -> IpAddress
8. note Name field has no leading '/' character as in docker
9. group["NumberInstances"]["Desired"] is String ("3"), should be int (3)
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
    <meta charset="UTF-8">
    <title></title>
</head>
<body>
    <div id="spa" style="display:none">
        <span id="payload" resource-type="$resource_type" resource-url="$resource_url">
            $json
        </span>
    </div>

    <script src="/$app_name/application.js" type="text/javascript"></script>
</body>
</html>
'''

def get_response_text(status_code, response_json, resource_type):
    resource_url = request.url
    best = request.accept_mimetypes.best_match(['application/json', 'text/html'])
    if best == 'application/json' or status_code != 200:
        return response_json, status_code
    else:
        return Template(HTML_TEMPLATE).substitute(app_name=APP_NAME, json=response_json, resource_type=resource_type, resource_url=resource_url), status_code

def get_docker_url():
    path = request.full_path[:-1] if request.full_path[-1] == '?' else request.full_path
    path_segments = path.split('/')
    if path_segments[3] == 'images':
        if len(path_segments) == 4:
            docker_path = '/'.join(path_segments[3:]) + '/json'  # /<v>/containers/images -> /containers/images/json
        else:
            docker_path = '/'.join(path_segments[3:])   # /<v>/containers/images/xxx -> /containers/images/xxx
    else:
        docker_path = '/'.join(path_segments[2:]) # /<v>/containers/xxx -> /containers/xxx
    return 'http://%s/%s' % (DOCKER_REMOTE_HOST, docker_path)

"""
killed docker container:

  "State": {
    "Error": "",
    "ExitCode": -1,
    "FinishedAt": "2015-01-18T20:30:37.512283287Z",
    "OOMKilled": false,
    "Paused": false,
    "Pid": 0,
    "Restarting": false,
    "Running": false,
    "StartedAt": "2015-01-18T20:29:07.117411842Z"
  },

running docker container:

  "State": {
    "Error": "",
    "ExitCode": 0,
    "FinishedAt": "0001-01-01T00:00:00Z",
    "OOMKilled": false,
    "Paused": false,
    "Pid": 5197,
    "Restarting": false,
    "Running": true,
    "StartedAt": "2015-01-18T20:29:07.402833784Z"
  },

paused docker container:

  "State": {
    "Error": "",
    "ExitCode": 0,
    "FinishedAt": "0001-01-01T00:00:00Z",
    "OOMKilled": false,
    "Paused": true,
    "Pid": 6284,
    "Restarting": false,
    "Running": true,
    "StartedAt": "2015-01-18T20:30:07.220679896Z"
  },

stopped/exited docker container:

  "State": {
    "Error": "",
    "ExitCode": 0,
    "FinishedAt": "2015-01-19T18:09:53.691721551Z",
    "OOMKilled": false,
    "Paused": false,
    "Pid": 0,
    "Restarting": false,
    "Running": false,
    "StartedAt": "2015-01-19T18:09:53.67503787Z"
  },
"""
def get_container_status(container_json):
    # Return one of: 'Running' | 'NOSTATE' | 'Shutdown' | 'Crashed' | 'Paused' | 'Suspended'
    # Note: 'Paused' and "Running' are clear but,
    #  how do "docker create", "docker kill", "docker stop" and "exited container" map to 'Shutdown', 'Crashed', 'Suspended', 'NOSTATE' ?
    #  Answers from Paulo:
    #    1. 'Suspended' is a Nova state that will never happen (should probably remove from ccs api)
    #    2. 'Shutdown' for stopped container (/v/container/id/stop)
    #    3. 'Crashed' for container that has exited
    if container_json["State"]["Paused"]:
        return "Paused"
    if not container_json["State"]["Restarting"]:
        if container_json["State"]["Running"]:
            return "Running"
        if container_json["State"]["OOMKilled"]: # Out Of Memory"
            return "Crashed"
        if container_json["State"]["ExitCode"]:
            return "Crashed"
        else:
            return "Shutdown"
    return "NOSTATE"

def fixup_containers_response(containers_json):
    for container in containers_json:
        container_url = 'http://%s/containers/%s/json' % (DOCKER_REMOTE_HOST, container["Id"])
        r = requests.get(container_url, headers={'Accept': 'application/json'})
        if r.status_code != 200:
            return r.status_code, r.text
        container_json = r.json()

        # The following properties are missing or incompatible
        container["ImageId"] = container_json["Image"]
        container["Name"] = container_json["Name"][1:] if container_json["Name"].startswith("/") else container_json["Name"]
        container["NetworkSettings"] = {}
        container["NetworkSettings"]["IpAddress"] = container_json["NetworkSettings"]["IPAddress"]
        container["NetworkSettings"]["PublicIpAddress"] = ""
        container["Status"] = get_container_status(container_json)
        # Skipping the following because I don't know what they are or where to find their values:
        # container["SizeRootFs"]
        # container["SizeRw"]

    return 200, containers_json

# init the flask app
app = Flask(__name__, static_folder=APP_NAME)

"""
# Group Authentication

"""

"""
## POST /{version}/containers/tokens

Request an authorization token for all the container cloud service API requests.

+ Request with username and password (application/json)
  + Headers
       Accept:  application/json

```json
       {
        "auth":
              {"tenantName": "admin",
               "passwordCredentials":
                                    {
                                     "username": "admin",
                                     "password": "devstack"
                                     }
               }
        }
```

+ Request with API key (application/json)
  + Headers
       Accept:  application/json

```json
        {
        "auth":
              {
               "key": "api_key"
              }
        }
```

+ Response (application/json)

```json
   {
    "access": {
        "token": {
            "issued_at": "2013-11-06T20:06:24.113908",
            "expires": "2013-11-07T20:06:24Z",
            "id": "<TOKEN>",
            "tenant": {
                "description": null,
                "enabled": true,
                "id": "604bbe45ac7143a79e14f3158df67091",
                "name": "admin"
            }
        }
    }
```
+ Response 400 (text/plain)
+ Response 401 (text/plain)
+ Response 500 (text/plain)

"""
@app.route('/<v>/containers/tokens', methods=['POST'])
def get_token(v):
    return "TODO", 200

"""
# Group Containers Management

"""

"""
## GET /{version}/containers/json{?all,limit,size}

Returns a list of (running) containers.

+ Parameters
    + all (optional, boolean, `1/True/true or 0/False/false`) ... Show all containers - only running containers are shown by default.
    + limit (optional, int, `10`) ... Show limit last created containers, include non-running ones.
    + size (optional, boolean, `1/True/true or 0/False/false`) ... Show the containers sizes


+ Request (application/json)
  + Headers
       Accept:  application/json
       X-Auth-Token: <TOKEN>

+ Response 200 (application/json)

```json
   [
         {
                 "Id": "8dfafdbc3a44",
                 "Name": "cont1",
                 "Image": "base:latest",
                 "Command": "echo 1",
                 "Created": 1367854155,
                 "Status": "Exit 0",
                 "Ports":[{"PrivatePort": 2222, "PublicPort": 3333, "Type": "tcp"}],
                 "NetworkSettings": {
                         "IpAddress": "192.123.12.13",
                         "PublicIpAddress": "93.12.1.14"
                 },
                 "SizeRw":0,
                 "SizeRootFs":0
         },
         {
                 "Id": "8dfafdbc3a45",
                 "Name":"cont2",
                 "Image": "ubuntu:latest",
                 "Command": "/bin/bash",
                 "Created": 1367884155,
                 "Status": "Exit 0",
                 "NetworkSettings": {
                         "IpAddress": "192.123.12.15",
                         "PublicIpAddress": "93.12.1.17"
                 },
                 "Ports":[{"PrivatePort": 2224, "PublicPort": 3333, "Type": "tcp"}],
                 "SizeRw":12288,
                 "SizeRootFs":0
         }
    ]
```
+ Response 400 (text/plain)
+ Response 401 (text/plain)
+ Response 500 (text/plain)

"""
@app.route('/<v>/containers/json', methods=['GET'])
def get_running_containers(v):
    r = requests.get(get_docker_url(), headers={'Accept': 'application/json'})
    status_code, response_json = fixup_containers_response(r.json()) if r.status_code == 200 else (r.status_code, r.text)
    return get_response_text(status_code, json.dumps(response_json), 'containers')

"""
## POST /{version}/containers/create{?name}

Creates and start a container. In the Docker API there are two separate APIs to create and start a container. With Nova we can only create and start a container in one step, therefore this API merges parameters from the Docker create and start container.

+ Parameters
    + name (optional, string, `mydocker1`) ... name of the container.

+ Request (application/json)
  + Headers
     Accept:  application/json
     X-Auth-Token: <TOKEN>

```json
    {
         "Memory":0,
         "CpuShares": 512,
         "NumberCpus": 1,
         "Env":null,
         "Cmd":[
                 "date"
         ],
         "Image":"base",
         "WorkingDir":"",
    }
```
+ Response 201 (application/json)

```json
      {
            "Id": "8dfafdbc3a43",
            "Warnings":[]
      }
```

+ Response 400 (test/plain)
     bad parameter
+ Response 401 (text/plain)
+ Response 500 (text/plain)

"""

@app.route('/<v>/containers/create', methods=['POST'])
def create_and_start_container(v):
    r = requests.post(get_docker_url(), headers=request.headers, data=request.data)
    #TODO: if create was successful, call /containers/{id}/start
    return r.text, r.status_code

"""
## POST /{version}/containers/{id}/start

Starts a container.

+ Request (application/json)
  + Headers
       Accept:  application/json
       X-Auth-Token: <TOKEN>

+ Response 204 (plain/text)
   no error
+ Response 304 (plain/text)
   container already started
+ Response 401 (text/plain)
+ Response 404 (plain/text)
   no such container
+ Response 500 (plain/text)
   server error

"""
@app.route('/<v>/containers/<id>/start', methods=['POST'])
def start_container(v,id):
    r = requests.post(get_docker_url(), headers=request.headers, data=request.data)
    return r.text, r.status_code

"""
## GET /{version}/containers/{id}/json

Return low-level information on the container {id}

+ Request (application/json)
  + Headers
       Accept:  application/json
       X-Auth-Token: <TOKEN>

+ Response 200 (application/json)

```json
        {
                 "Id": "4fa6e0f0c6786287e131c3852c58a2e01cc697a68231826813597e4994f1d6e2",
                 "Created": "2013-05-07T14:51:42.041847+02:00",
                 "Path": "date",
                 "Args": [],
                 "Config": {
                         "Hostname": "4fa6e0f0c678",
                         "User": "",
                         "Memory": 0,
                         "MemorySwap": 0,
                         "AttachStdin": false,
                         "AttachStdout": true,
                         "AttachStderr": true,
                         "PortSpecs": null,
                         "Tty": false,
                         "OpenStdin": false,
                         "StdinOnce": false,
                         "Env": null,
                         "Cmd": [
                                 "date"
                         ],
                         "Dns": null,
                         "Image": "base",
                         "Volumes": {},
                         "VolumesFrom": "",
                         "WorkingDir":""
                         },
                 "State": {
                         "Running": false,
                         "Pid": 0,
                         "ExitCode": 0,
                         "StartedAt": "2013-05-07T14:51:42.087658+02:01360",
                         "Ghost": false
                 },
                 "Image": "b750fe79269d2ec9a3c593ef05b4332b1d1a02a62b4accb2c21d589ff2f5f2dc",
                 "NetworkSettings": {
                         "IpAddress": "",
                         "PublicIpAddress": "93.12.1.17",
                         "IpPrefixLen": 0,
                         "Gateway": "",
                         "Bridge": "",
                         "PortMapping": null
                 },
                 "SysInitPath": "/home/kitty/go/src/github.com/docker/docker/bin/docker",
                 "ResolvConfPath": "/etc/resolv.conf",
                 "Volumes": {},
                 "HostConfig": {
                     "Binds": null,
                     "ContainerIDFile": "",
                     "LxcConf": [],
                     "Privileged": false,
                     "PortBindings": { },
                     "Links": ["/name:alias"],
                     "PublishAllPorts": true
                 }
    }
```
+ Response 401 (text/plain)
+ Response 404 (text/plain)
    no such container
+ Response 500 (text/plain)

"""
@app.route('/<v>/containers/<id>/json', methods=['GET'])
def show_container_info(v,id):
    r = requests.get(get_docker_url(), headers={'Accept': 'application/json'})
    return get_response_text(r.status_code, r.text, 'container')

"""
## GET /{version}/containers/{id}/logs{?stdout,stderr}
Get stdout and stderr logs from the container id
TODO - check if could return a stream or just plain text (deviating from current docker log API)


+ Parameters
    + stdout (optional, boolean, `1/True/true or 0/False/false`) ... show stdout log. Default true.
    + stderr (optional, boolean, `1/True/true or 0/False/false`) ... show stderr log. Default false.

+ Request (application/json)
  + Headers
       Accept:  application/json
       X-Auth-Token: <TOKEN>

+ Response 200 (application/vnd.docker.raw-stream)

   ```
     {{ STREAM }}
   ```
+ Response 401 (text/plain)
+ Response 404 (text/plain)
    no such container
+ Response 500 (text/plain)

"""
@app.route('/<v>/containers/<id>/logs', methods=['GET'])
def get_logs(v,id):
    r = requests.get(get_docker_url(), headers={'Accept': 'application/json'})
    return get_response_text(r.status_code, r.text, 'logs')

"""
## POST /{version}/containers/{id}/stop{?t}

Stops the container {id}

+ Parameters
    + t (optional, int, 10) ... number of seconds to wait before killing the container

+ Request (application/json)
  + Headers
       Accept:  application/json
       X-Auth-Token: <TOKEN>

+ Response 204 (text/plain)
+ Response 304 (text/plain)
    container already stopped
+ Response 401 (text/plain)
+ Response 404 (text/plain)
    no such container
+ Response 500 (text/plain)

"""
@app.route('/<v>/containers/<id>/stop', methods=['POST'])
def stop_container(v,id):
    r = requests.post(get_docker_url(), headers=request.headers, data=request.data)
    return r.text, r.status_code

"""
## POST /{version}/containers/{id}/restart{?t}

Restarts the container {id}

+ Parameters
    + t (optional, int, 10) ... number of seconds to wait before killing the container

+ Request (application/json)
  + Headers
       Accept:  application/json
       X-Auth-Token: <TOKEN>

+ Response 204 (text/plain)
+ Response 304 (text/plain)
    container already stopped
+ Response 401 (text/plain)
+ Response 404 (text/plain)
    no such container
+ Response 500 (text/plain)

"""
@app.route('/<v>/containers/<id>/restart', methods=['POST'])
def restart_container(v,id):
    r = requests.post(get_docker_url(), headers=request.headers, data=request.data)
    return r.text, r.status_code


"""
## POST /{version}/containers/{id}/pause

Pause a container {id}.

+ Request (application/json)
  + Headers
       Accept:  application/json
       X-Auth-Token: <TOKEN>


+ Response 204 (text/plain)
+ Response 401 (text/plain)
+ Response 404 (text/plain)
    no such container
+ Response 500 (text/plain)

"""
@app.route('/<v>/containers/<id>/pause', methods=['POST'])
def pause_container(v,id):
    r = requests.post(get_docker_url(), headers=request.headers, data=request.data)
    return r.text, r.status_code

"""
## POST /{version}/containers/{id}/unpause

Pause a container {id}.

+ Request (application/json)
  + Headers
       Accept:  application/json
       X-Auth-Token: <TOKEN>


+ Response 204 (text/plain)
+ Response 401 (text/plain)
+ Response 404 (text/plain)
    no such container
+ Response 500 (text/plain)

"""
@app.route('/<v>/containers/<id>/unpause', methods=['POST'])
def unpause_container(v,id):
    r = requests.post(get_docker_url(), headers=request.headers, data=request.data)
    return r.text, r.status_code

"""
## DELETE /{version}/containers/{id}

Deletes a container {id}. The container is first killed by default.

+ Request (application/json)
  + Headers
       Accept:  application/json
       X-Auth-Token: <TOKEN>


+ Response 204 (text/plain)
+ Response 400 (test/plain)
     bad parameter
+ Response 401 (text/plain)
+ Response 404 (text/plain)
    no such container
+ Response 500 (text/plain)

"""
@app.route('/<v>/containers/<id>', methods=['DELETE'])
def delete_container(v,id):
    #TODO: first call /containers/{id}/kill
    r = requests.delete(get_docker_url(), headers=request.headers)
    return r.text, r.status_code

"""
# Group Images Management
Container cloud users may boot images from the private container cloud docker registry or docker hub. Images need to be registered in container cloud before they can be used in a container create or group start command.

A new API (vs. implicit registration or use of glance API) is required for satisfying the following requirements:

As a user (Maureen) of container cloud:
* I want to be able to push and use images from a private docker repository
* I want to be able to use public images from docker hub
* I want to be able to mark some images so that they can start within a predictable time (e.g. pre-caching them on docker host nodes) and have control on which marking / unmarking such images.
* I want to be able to control which images from docker hub or private docker registry can be used to launch containers in container cloud.
* I want to be able to use images imported from Glance by a user interacting with the OpenStack Glance API

"""

"""
## POST /{version}/containers/images/register

Register an image from docker hub or private docker registry in container cloud.

+ Request (application/json)
  + Headers
       Accept:  application/json

```json
    {
         "Image": "docker-registry.mybluemix.net/wfaas/servicebroker:latest",
         "FastStart": "true"
    }
```
+ Response 201 (application/json)

```json
      {
            "Id": "8dfafdbc3a43445566",
      }
```
+ Response 400 (text/plain)
     Bad parameter
+ Response 401 (text/plain)
+ Response 409 (text/plain)
    Image already registered
+ Response 500 (text/plain)

"""
@app.route('/<v>/containers/images/register', methods=['POST'])
#@token_required
def register_image(v):
    #TODO: this isn't right ... no corresponding Docker API
    r = requests.post(get_docker_url(), headers=request.headers, data=request.data)
    return r.text, r.status_code

"""
## GET /{version}/containers/images

List all available images in for a tenant in container cloud

+ Request (application/json)
  + Headers
       Accept:  application/json

```json
       [
         {
          "Image": "docker-registry.mybluemix.net/wfaas/servicebroker:latest",
          "Id": "12345667544332",
          "Created": "2014-09-07T14:51:42.041847+02:00",
          "FastStart": true,
          "isReference": true
         },
          {
          "Image": "ubuntu_latest",
          "Id": "12345667544334",
          "Created": "2014-09-08T14:51:42.041847+02:00",
          "FastStart": false,
          "isReference": false
         },
       ]
```
+ Response 201 (application/json)

```json
      {
            "Id": "8dfafdbc3a43445566",
      }
```
+ Response 401 (text/plain)
+ Response 400 (text/plain)
+ Response 500 (text/plain)

"""
# TODO should we consider adding '/json' to be consistent with container list??
@app.route('/<v>/containers/images', methods=['GET'])
def get_images(v):
    r = requests.get(get_docker_url(), headers={'Accept': 'application/json'})
    return get_response_text(r.status_code, r.text, 'images')

"""
## PUT /{version}/containers/images/<id>

Updates registered image. This API should be used if a new version with the same tag should replace the existing version or if the FastStart flag should be modified. Note that this API is a convenience which is equivalent to calling DELETE and then POST; as such it will always generate a new Id for the image.

+ Request (application/json)
  + Headers
       Accept:  application/json

```json
    {
         "Image": "docker-registry.mybluemix.net/wfaas/servicebroker:latest",
         "FastStart": false
    }
```
+ Response 204 (application/json)

```json
      {
            "Id": "8dfafdbc3a43445566",
      }
```
+ Response 400 (text/plain)
     Bad parameter
+ Response 401 (text/plain)
+ Response 404 (text/plain)
    No such image
+ Response 500 (text/plain)

"""
@app.route('/<v>/containers/images/<id>', methods=['PUT'])
def update_image_registration(v,id):
   #TODO: how to implement ... no corresponding Docker API
   return "", 201

"""
## DELETE /{version}/containers/images/<id>

Deletes registration for an existing registered image <id>.

+ Request (application/json)
  + Headers
       Accept:  application/json

+ Response 204 (text/plain)
+ Response 401 (text/plain)
+ Response 404 (text/plain)
    No such group
+ Response 500 (text/plain)

"""
@app.route('/<v>/containers/images/<id>', methods=['DELETE'])
def unregister_image(v,id):
    #TODO: this isn't right ... Docker API expects image name (not <id>)
    r = requests.delete(get_docker_url(), headers=request.headers)
    return r.text, r.status_code


"""
# Group IP Addresses Management

"""

"""
## GET /{version}/containers/floating-ips{?all}


Returns a list of (available) floating IPs

+ Parameters
    + all (optional, boolean, `1/True/true or 0/False/false`) ... Show all floating IPs - only available ones are shown by default.

+ Request (application/json)
  + Headers
       Accept:  application/json
       X-Auth-Token: <TOKEN>


+ Response 200 (application/json)

```json
   [
         {
                 "IpAddress": "192.123.12.13",
                 "Bindings": null
         },
         {
                 "IpAddress": "192.123.12.13",
                 "Bindings": {"ContainerId":"ab04566123"}
         }
   ]
```
+ Response 400 (text/plain)
+ Response 401 (text/plain)
+ Response 500 (text/plain)

"""
@app.route('/<v>/containers/floating-ips', methods=['GET'])
def get_floating_ips(v):
    dummy_response = \
'''
[
    {
        "Bindings": {
            "ContainerId": null
        },
        "IpAddress": "1.1.1.1"
    },
    {
        "Bindings": {
            "ContainerId": null
        },
        "IpAddress": "2.2.2.2"
    }
]
'''
    return dummy_response, 200

"""
## POST /{version}/containers/{id}/floating-ips/{ip}/bind

Bind floating ip {ip} to container {id}

+ Request (application/json)
  + Headers
       Accept:  application/json
       X-Auth-Token: <TOKEN>


+ Response 204 (text/plain)
+ Response 400 (test/plain)
     no such ip
+ Response 401 (text/plain)
+ Response 404 (text/plain)
    no such container
+ Response 500 (text/plain)

"""
@app.route('/<v>/containers/<id>/floating-ips/<ip>/bind', methods=['POST'])
def set_floating_ips(v,id, ip):
    return "", 204

"""
## POST /{version}/containers/{id}/floating-ips/{ip}/unbind

Unbind floating ip {ip} from container {id}

+ Request (application/json)
  + Headers
       Accept:  application/json
       X-Auth-Token: <TOKEN>


+ Response 204 (text/plain)
+ Response 400 (test/plain)
     no such ip
+ Response 401 (text/plain)
+ Response 404 (text/plain)
    no such container
+ Response 500 (text/plain)

"""
@app.route('/<v>/containers/<id>/floating-ips/<ip>/unbind', methods=['POST'])
def unset_floating_ips(v,id, ip):
    return "", 204

"""
# Group Scaling Groups Management

"""

"""
## GET /{version}/containers/groups

Returns a list of scaling groups

+ Request (application/json)
  + Headers
       Accept:  application/json
       X-Auth-Token: <TOKEN>


+ Response 200 (application/json)

```json
   [
         {
           "Name": "MyGroup1",
           "Id":"ab12cdaef",
           "Memory":0,
           "CpuShares": 512,
           "Env":null,
           "Cmd":[
                 "date"
            ],
           "Image":"ubuntu",
           "WorkingDir":"",
           "RestartPolicy": { "Name": "always", "HealthCheckType" : "HttpHealthCheck", "HealthCheckUrl":"/ping" },
           "NumberInstances": {"Desired":"2", "Min" : 1, "Max" : 4},
           "AutoScalingPolicy" : {}
         },
         {
          "Name": "MyGroup2",
          "Id":"aa12cdaef",
          "Memory":0,
          "CpuShares": 512,
          "Env":null,
          "Cmd":[
                 "date"
          ],
          "Image":"centos",
          "WorkingDir":"",
          "RestartPolicy": { "Name": "always", "HealthCheckType" : "HttpHealthCheck", "HealthCheckUrl":"/ping" },
          "NumberInstances": {"Desired":"2", "Min" : 1, "Max" : 4},
          "AutoScalingPolicy" : {}
        }
    ]
```
+ Response 401 (text/plain)
+ Response 500 (text/plain)

"""
@app.route('/<v>/containers/groups', methods=['GET'])
def list_groups(v):
    groups = GROUP_STORE.list_groups()
    return get_response_text(200, json.dumps(groups), 'groups')

"""
## POST /{version}/containers/groups/create

Create a new scaling group.
TODO - evaluate if I can pass tags / version info (would HEAT support that)

+ Request (application/json)
  + Headers
       Accept:  application/json
       X-Auth-Token: <TOKEN>


```json
       {
         "Name": "MyGroup3",
         "Memory":0,
         "CpuShares": 512,
         "Env":null,
         "Cmd":[
                 "date"
         ],
         "Image":"keeper",
         "WorkingDir":"",
         "RestartPolicy": { "Name": "always", "HealthCheckType" : "HttpHealthCheck", "HealthCheckUrl":"/ping" },
         "NumberInstances": {"Desired":"2", "Min" : 1, "Max" : 4},
         "AutoScalingPolicy" : {}
       }
```
+ Response 201 (application/json)

```json
      {
            "Id": "8dfafdbc3a43",
            "Warnings":[]
      }
```
+ Response 400 (text/plain)
     Bad parameter
+ Response 401 (text/plain)
+ Response 409 (text/plain)
    Scaling group with that name already exists
+ Response 500 (text/plain)

"""
@app.route('/<v>/containers/groups/create', methods=['POST'])
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

"""
## PUT /{version}/containers/groups/{id}

Updates a scaling group. May pass only the JSON parameters to update (?).
TODO - check what parameters might be updated from the HEAT template implementation.

+ Request (application/json)
  + Headers
       Accept:  application/json
       X-Auth-Token: <TOKEN>


```json
       {
         "Id": "8dfafdbc3a43",
         "NumberInstances": {"Desired":"2", "Min" : 1, "Max" : 4},
         "AutoScalingPolicy" : {}
       }
```
+ Response 204 (text/plain)
+ Response 400 (text/plain)
     Bad parameter
+ Response 401 (text/plain)
+ Response 404 (text/plain)
    No such group
+ Response 500 (text/plain)

"""
@app.route('/<v>/containers/groups/<id>', methods=['PUT'])
def update_group(v,id):
    new_group = json.loads(request.data)
    group = GROUP_STORE.get_group(id)
    if not group:
        return "Not found", 404
    if "Id" in new_group and new_group["Id"] != id:
        return "Invalid Id property", 400
    if "NumberInstances" not in new_group or \
       "Desired" not in new_group["NumberInstances"] or \
       "Min" not in new_group["NumberInstances"] or \
       "Max" not in new_group["NumberInstances"] or \
       int(new_group["NumberInstances"]["Desired"]) < new_group["NumberInstances"]["Min"] or \
       int(new_group["NumberInstances"]["Desired"]) > new_group["NumberInstances"]["Max"]:
        return "Invalid NumberInstances property", 400
    group.update(new_group)
    GROUP_STORE.put_group(group)
    return "", 204

"""
## DELETE /{version}/containers/groups/{id}

Stops and deletes a scaling group.

+ Request (application/json)
  + Headers
       Accept:  application/json
       X-Auth-Token: <TOKEN>


+ Response 204 (text/plain)
+ Response 401 (text/plain)
+ Response 404 (text/plain)
    No such group
+ Response 500 (text/plain)

"""
@app.route('/<v>/containers/groups/<id>', methods=['DELETE'])
def delete_group(v,id):
    group = GROUP_STORE.get_group(id)
    if not group:
        return "Not found", 404
    delete_instances(group)
    GROUP_STORE.delete_group(id)
    return "", 204

"""
## GET /{version}/containers/groups/{id}/health

Returns health status for containers in group {id}

+ Request (application/json)
  + Headers
       Accept:  application/json
       X-Auth-Token: <TOKEN>


+ Response 200 (application/json)

```json
   [
          {
           "Name": "cont1",
           "Ip":"192.12.14.13",
           "Status": "Up"
           },
           {
           "Name": "cont2",
           "Ip":"192.12.14.14",
           "Status": "Stale"
           }
   ]
```
+ Response 401 (text/plain)
+ Response 500 (text/plain)

"""
@app.route('/<v>/containers/groups/<id>/health', methods=['GET'])
def get_group_health(v,id):
    r = requests.get('http://%s/%s' % (DOCKER_REMOTE_HOST, 'containers/json?all=1'), headers={'Accept': 'application/json'})
    if r.status_code != 200:
        return r.status_code, r.text
    status_code, running_containers = fixup_containers_response(r.json())
    if status_code != 200:
        return status_code, running_containers
    group_prefix = GROUP_STORE.get_group(id)["Name"] + '_'
    response = []
    for container in running_containers:
        if container["Name"].startswith(group_prefix):
            container_info = {"Name": container["Name"], "Ip": container["NetworkSettings"]["IpAddress"], "Status": container["Status"]}
            response.append(container_info)
    return get_response_text(status_code, json.dumps(response), 'group_health')

### Start up code
if __name__ == '__main__':
    app.run(host='0.0.0.0')
else:
    application = app
