Current API Listing
===================

```
CCS API                                                     Docker API
-------------------------------------------------------     ------------------------------------------------------------------------------------
GET    /{version}/containers/json{?all,limit,size}          /containers/json{?all,limit,size}
POST   /{version}/containers/create{?name}                  /containers/create{?name} (also POST /containers/(id)/start)
POST   /{version}/containers/{id}/start                     /containers/(id)/start
GET    /{version}/containers/{id}/json                      /containers/(id)/json
GET    /{version}/containers/{id}/logs{?stdout}             /containers/(id)/logs{?stdout}
POST   /{version}/containers/{id}/stop{?t}                  /containers/(id)/stop{?t}
POST   /{version}/containers/{id}/restart{?t}               /containers/(id)/restart{?t}
POST   /{version}/containers/{id}/pause                     /containers/(id)/pause
POST   /{version}/containers/{id}/unpause                   /containers/(id)/unpause
DELETE /{version}/containers/{id}                           /containers/(id) (The container is first killed by default ???)

POST   /{version}/containers/images/register                ???
GET    /{version}/containers/images/json                    /images/json
PUT    /{version}/containers/images/<id>                    ???
DELETE /{version}/containers/images/<id>                    /images/(name) (note id vs name ???)

The following have no corresponding Docker API:

GET    /{version}/containers/groups
POST   /{version}/containers/groups
GET    /{version}/containers/groups/{name}
PATCH  /{version}/containers/groups/{name}
GET    /{version}/containers/groups/{name}/containers
DELETE /{version}/containers/groups/{id}
GET    /{version}/containers/groups/{id}/floating-ips
POST   /{version}/containers/groups/maproute{?name}
POST   /{version}/containers/groups/unmaproute{?name}

GET    /{version}/containers/floating-ips{?all}
POST   /{version}/containers/{id}/floating-ips/{ip}/bind
POST   /{version}/containers/{id}/floating-ips/{ip}/unbind
POST   /{version}/containers/floating-ips/request
POST   /{version}/containers/floating-ips/{ip}/release

POST   /{version}/containers/tokens
GET    /{version}/containers/usage
GET    /{version}/containers/gettoken{?tenant=$OS_TENANT_NAME&user=$OS_USERNAME&password=$OS_PASSWORD}
POST   /{version}/containers/build

PUT    /{version}/registry/namespaces/<namespace>
GET    /{version}/registry/namespaces/<namespace>
GET    /{version}/registry/namespaces
DELETE /{version}/registry/namespaces
```

Proposed Changes
================

1. "Env" field
--------------

```
## POST /{version}/containers/create{?name
## POST /{version}/containers/groups
## GET /{version}/containers/groups/{name}
old:
        "Env": "key1=value1,key2=value2",
new:
        "Env": [ "key1=value1", "key2=value2" ],

## GET /{version}/containers/{id}/json
old:
        "Env": {
            "key1": "value1",
            "key2": "value2"
        },
new:
        "Env": [ "key1=value1", "key2=value2" ],
```

2. "Status" field
-----------------

```
## GET /{version}/containers/json{?all,limit,size}
old:
        "Status": "Running", /* 'Running' | 'NOSTATE' | 'Shutdown' | 'Crashed' | 'Paused' | 'Suspended' */
new:
        "ContainerState": "Running", /* 'Running' | 'NOSTATE' | 'Shutdown' | 'Crashed' | 'Paused' | 'Suspended' */

## GET /{version}/containers/{id}/json
old:
        "State": { 
            "Status": "Running", 
            ... 
            },
new:
        "ContainerState": "Running",

## GET /{version}/containers/groups/{name}/containers
old:
        "Status": "Running",
new:
        "ContainerState": "Running",
```

3. "Created" field
------------------

```
## GET /{version}/containers/json{?all,limit,size}
## GET /{version}/containers/groups/{name}/containers
old:
        "Created": 1367854155
new:
        <no change>

## GET /{version}/containers/{id}/json
## GET /{version}/containers/images/json
old:
        "Created": "2014-11-19T14:54:49Z"
new:
        "Created": 1367854155
```

4. "Group" field
----------------

```
## GET /{version}/containers/json{?all,limit,size}
## GET /{version}/containers/{id}/json
## GET /{version}/containers/groups/{name}/containers
old:
        "Group": {
            "Name" : "mygroup",
            "Id"  : "c456416-5cddc-408a-a628-a5da55ca011c",
            "Url" : "https://ice-api.ng.bluemix.net/v2/containers/groups/c456416-5cddc-408a-a628-a5da55ca011c"
            },
new:
        "Group": {
            "Name" : "mygroup",
            "Id"  : "c456416-5cddc-408a-a628-a5da55ca011c",
            },
```

5. "AvailableSizes"
-------------------

```
## GET /{version}/containers/usage
old:
        {
            "Limits": {
                "containers": 8,
                "vcpu": 8,
                "memory_MB": 2048,
                "floating_ips": 2
                },
            "Usage": {
                "containers": 5,
                "running": 4,
                "vcpu": 4,
                "memory_MB": 1024,
                "floating_ips": 2
                }
        }
new:
        {
            "Limits": {
                "containers": 8,
                "vcpu": 8,
                "memory_MB": 2048,
                "floating_ips": 2
                },
            "Usage": {
                "containers": 5,
                "running": 4,
                "vcpu": 4,
                "memory_MB": 1024,
                "floating_ips": 2
                }
            "AvailableSizes": [
                {
                    "memory_MB": 256,
                    "vcpus": 1,
                    "disk": 1,
                    "name": "m1.tiny"
                    },
                {
                    "memory_MB": 1024,
                    "vcpus": 4,
                    "disk": 10,
                    "name": "m1.medium"
                    },
                {
                    "memory_MB": 512,
                    "vcpus": 2,
                    "disk": 2,
                    "name": "m1.small"
                    },
                {
                    "memory_MB": 2048,
                    "vcpus": 8,
                    "disk": 10,
                    "name": "m1.large"
                    }
                ]
            }
        }
```

6. Group URLs
-------------

```
old:
        GET    /{version}/containers/groups/{name}
        PATCH  /{version}/containers/groups/{name}
        GET    /{version}/containers/groups/{name}/containers
        DELETE /{version}/containers/groups/{id}
        GET    /{version}/containers/groups/{id}/floating-ips
        POST   /{version}/containers/groups/maproute{?name}
        POST   /{version}/containers/groups/unmaproute{?name}
new:
        GET    /{version}/containers/groups/{name_or_id}
        PATCH  /{version}/containers/groups/{name_or_id}
        GET    /{version}/containers/groups/{name_or_id}/containers
        DELETE /{version}/containers/groups/{name_or_id}
        GET    /{version}/containers/groups/{name_or_id}/floating-ips
        POST   /{version}/containers/groups/{name_or_id}/maproute
        POST   /{version}/containers/groups/{name_or_id}/unmaproute

note: 
        name_or_id == name | id | either
```

7. Group containers URL
-----------------------

```
old:
        GET /{version}/containers/groups/{name}/containers
new:
        GET /{version}/containers/json?group={name_or_id}
```

8. Tenants
----------

```
old:
       GET /{version}/containers/json{?all,limit,size)
       POST   /{version}/containers/create{?name}
       POST   /{version}/containers/{id}/start
       ... (i.e., all APIs)
new:
       optional ?tenant=space_id
```

9. Accept: text/html
--------------------

```
old:
       GET -H "Accept: text/html" /{version}/containers/json{?all,limit,size}
       GET -H "Accept: text/html" /{version}/containers/{id}/json
       GET -H "Accept: text/html" /{version}/containers/{id}/logs{?stdout}
       GET -H "Accept: text/html" /{version}/containers/images/json
       GET -H "Accept: text/html" /{version}/containers/groups
       GET -H "Accept: text/html" /{version}/containers/groups/{name}
       GET -H "Accept: text/html" /{version}/containers/groups/{name}/containers
       returns:
           {JSON_RESPONCE}
new:
       GET -H "Accept: text/html" /{version}/containers/json{?all,limit,size}
       GET -H "Accept: text/html" /{version}/containers/{id}/json
       GET -H "Accept: text/html" /{version}/containers/{id}/logs{?stdout}
       GET -H "Accept: text/html" /{version}/containers/images/json
       GET -H "Accept: text/html" /{version}/containers/groups
       GET -H "Accept: text/html" /{version}/containers/groups/{name}
       GET -H "Accept: text/html" /{version}/containers/groups/{name}/containers
       returns:
           <!DOCTYPE html>
           <html lang="en">
             <head>
               <meta charset="UTF-8">
               <title></title>
             </head>
             <body>
               <div id="spa" style="display:none">
                 <span id="payload" resource-type="containers" resource-url="http://localhost:5000/v2/containers/json">
                   {JSON_RESPONCE}
                 </span>
               </div>
               <script src="/ccs/application.js" type="text/javascript"></script>
             </body>
           </html>
```
