# IBM Containers Emulator

IBM (Bluemix) Containers Emulator wraps the [Docker API](https://docs.docker.com/reference/api/docker_remote_api/) and implements a subset of the actual [IBM Containers API](https://www.ng.bluemix.net/docs/containers/container_index.html), so that you can deploy and test your containers in a local Docker environment before running them on Bluemix. Specifically, it provides an emulation of the APIs in [Containers](http://ccsapi-doc.mybluemix.net/#!/Containers), [Container Groups](http://ccsapi-doc.mybluemix.net/#!/Container_Groups), and *GET /images/json* in [Images](http://ccsapi-doc.mybluemix.net/#!/Images).

Using the emulator you can create container groups and map them to load-balanced routes, just as you would on Bluemix, only the underlying Docker containers will be running in your local docker environment and the mapped routes will be managed by a local HAProxy load balancer. 

## Getting Started

To get started all you need is Docker running on your machine. The emulator, itself, runs in a docker container in the same docker environment that it will use to implement the API.

Start by cloning this project:
```
git clone git@github.rtp.raleigh.ibm.com:frankb-ca/mock_ccsapi.git
```
The *startup.sh* bash script can be used to start the emulator:
```bash
$ cd <project-root> # where you cloned this project
$ ./startup.sh
```
Once started, you should see a running container for the emulator in your local docker environment:
```
$ docker ps
CONTAINER ID        IMAGE                         COMMAND                CREATED             STATUS              PORTS                                                      NAMES
cd76c5ff9b0e        xdevops/ccs-emulator:latest   "/ccs-emulator/run-s   23 hours ago        Up 23 hours         0.0.0.0:5000->5000/tcp, 0.0.0.0:6001-6009->6001-6009/tcp   ccs-emulator
```
As you can see, the container exposes ports 5000 and 6001-6009. Port 5000 is the emulator API endpoint. Ports 6001-6009 are used for mapped routes. (Note that the emulator only supports localhost:6001 to localhost:6009 for the maproute API. Any other host/domain values will return an error.) 

You can now access the Container API at http://localhost:5000/v3. For example, to list container groups you can curl http://localhost:5000/v3/containers/groups, as described in [Container Groups](http://ccsapi-doc.mybluemix.net/#!/Container_Groups).

### Configuring for *boot2docker*

IBM Containers emulator only speaks HTTP, not HTTPS, so it is important that Docker be exposed via HTTP. To do this with [boot2docker](http://boot2docker.io):
```
boot2docker ssh
sudo su
vi /var/lib/boot2docker/profile
```
The file may not exist, if so it is fine as long as we add :
```
DOCKER_TLS=no
DOCKER_HOST:='-H tcp://0.0.0.0:2375'
```
and then restart boot2docker:
```
boot2docker halt
boot2docker up
```
At this point, boot2docker will suggest new environment settings for `docker` itself.
    
## Try the Example

There is a simple Hello World example in the *examples* directory that you can run to get a better idea of what the emulator is actually doing. There are 2 versions of the example program, one written in Python and the other in JavaScript. Take your pick. 

In both sub-directories you'll see a very simple Dockerfile for the application, which is a trivial web server that will simply respond with the message: ```Hello from container: <container_id>```. There's also a *run.sh* script that demonstrates how we run the hello example application as a Container Group mapped to the route *localhost:6001*. You can see from the *"NumberInstances"* field in the script that it starts the group with 2 instances:
```bash
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
```
When you run the script you should see output something like this:
```bash
$ cd example
$ ./run.sh
... bunch of output ...
Successfully built 1795d7c78136
created hello example group: 0da403fe2084ab5c
{"Name": "hello_example", "Image": "hello:v1", "Id": "0da403fe2084ab5c", "NumberInstances": {"Desired": 2, "Min": 1, "Max": 3}, "Memory": 256, "Routes": ["localhost:6001"], "Port": 5000}
bound localhost:6001 to the hello example group
```
If everything worked as expected you should now have 2 instances of the hello example image running in your docker environment:
```
$ docker ps
CONTAINER ID        IMAGE                         COMMAND                CREATED             STATUS              PORTS                                                      NAMES
364c56ed7138        hello:v1                      "python -u /hello/ap   16 hours ago        Up 16 hours         5000/tcp                                                   hello_example_4
0368617b9019        hello:v1                      "python -u /hello/ap   16 hours ago        Up 16 hours         5000/tcp                                                   hello_example_3
cd76c5ff9b0e        xdevops/ccs-emulator:latest   "/ccs-emulator/run-s   24 hours ago        Up 24 hours         0.0.0.0:5000->5000/tcp, 0.0.0.0:6001-6009->6001-6009/tcp   ccs-emulator
```
As mentioned above, the script maps the container group to the route *localhost:6001*, so if you curl, or point your browser at, http://localhost:6001/ you should see a message something like this:
```
$ curl http://localhost:6001/
Hello from container: 364c56ed7138
```
If you do it again, you should get a response from the second container:
```
$ curl http://localhost:6001/
Hello from container: 0368617b9019
```
As you repeat the above curl request, over and over, you will get alternating responses from the groups containers (2 in this case) as the load balancer forwards requests to the containers using a default round-robin algorithm.

## Using the Web UI

If you prefer to use a UI instead of the REST interface, to control your containers and groups, the IBM Containers emulator can also be controlled from your web browser. Simply point your browser to http://localhost:5000/v3/containers/json or http://localhost:5000/v3/containers/groups.

For example, with the hello example from the previous section running, you should see the following at http://localhost:5000/v3/containers/groups:

![groups screen](https://github.rtp.raleigh.ibm.com/frankb-ca/mock_ccsapi/raw/master/images/groups.jpg)

Here you can create new container groups, click on an existing container group to view or edit its properties, or click on the trashcan icon to delete a group and shutdown its associated containers. For example, if you click on the *hello_example* group you should see the following screen:

![hello group screen](https://github.rtp.raleigh.ibm.com/frankb-ca/mock_ccsapi/raw/master/images/hello_group.jpg)

Try changing the number of instances to 3 and then press the **Save** button.

If you wait about 10 seconds and then check your Docker containers, either using the UI (http://localhost:5000/v3/containers/json) or simply running "docker ps" again, you will see that you now have 2 instances of the hello example image running:
```
$ docker ps
CONTAINER ID        IMAGE                         COMMAND                CREATED             STATUS              PORTS                                                      NAMES
8aff88447f9f        hello:v1                      "python -u /hello/ap   8 seconds ago       Up 8 seconds        5000/tcp                                                   hello_example_5
364c56ed7138        hello:v1                      "python -u /hello/ap   16 hours ago        Up 16 hours         5000/tcp                                                   hello_example_4
0368617b9019        hello:v1                      "python -u /hello/ap   16 hours ago        Up 16 hours         5000/tcp                                                   hello_example_3
cd76c5ff9b0e        xdevops/ccs-emulator:latest   "/ccs-emulator/run-s   24 hours ago        Up 24 hours         0.0.0.0:5000->5000/tcp, 0.0.0.0:6001-6009->6001-6009/tcp   ccs-emulator
```

## Using the Cloud Foundry CLI and containers plug-in

**TODO: change ICE instructions to CF IC instructions.**

Use the [ice](https://github.rtp.raleigh.ibm.com/project-alchemy/ccscli) CLI to log in
```bash
ice login --host http://localhost:5000 --key `whoami`-token
# `whoami`-token just generates a dummy, which ice needs and is helpful for logging and simulating multi-user function.
```  
At this point, you can invoke ice commands which will operate against your local Docker environment.
```
ice ps
ice images
```
