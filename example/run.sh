# IBM (Bluemix) Containers Emulator

IBM Containers Emulator wraps the [Docker API](https://docs.docker.com/reference/api/docker_remote_api/) and implements a subset of the actual [IBM Containers API](https://www.ng.bluemix.net/docs/containers/container_index.html), so that you can deploy and test your containers in a local Docker environment before running them on Bluemix. Specifically, it provides an emulation of the APIs in [Containers](http://ccsapi-doc.mybluemix.net/#!/Containers) and [Container Groups](http://ccsapi-doc.mybluemix.net/#!/Container_Groups).

Using the emulator you can create container groups and map them to routes, just as you would on Bluemix, only the underlying Docker containers will be running in a local docker environment and the mapped routes will be managed by a local HAProxy server. 

### Getting Started

To get started all you need is Docker running on your machine. The emulator, itself, runs in a docker container in the same docker environment that it will use to implement the API.

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
As you can see, the container exposes ports 5000 and 6001-6009. Port 5000 is the emulator API endpoint, ports 6001-6009 are used for mapped routes. 

You can now access the Container API at http://localhost:5000/v3. For example, to list container groups you can GET http://localhost:5000/v3/containers/groups, as described in [Container Groups](http://ccsapi-doc.mybluemix.net/#!/Container_Groups).

### Try the Example

There is a simple Hello World example in the *example* directory that you can run to get a better idea of what the emulator is actually doing. In that directory you'll see a very simple Dockerfile for the application, which is a trivial python web server that will simply respond with the message: ```Hello from container: <container_id>```.

There's also a *run.sh* script that demonstrates how we run the application as a Container Group mapped to the route *localhost:6001*. You can see in the script that it starts the group with 2 instances:

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
bound route to hello example
```
If everything worked as expected you should now have 2 running instances of the hello example image running in your docker environment:

```
$ docker ps
CONTAINER ID        IMAGE                         COMMAND                CREATED             STATUS              PORTS                                                      NAMES
0dfd0322ce11        hello:v1                      "python -u /hello/ap   28 minutes ago      Up 28 minutes       5000/tcp                                                   hello_example_2
13b9e8abf735        hello:v1                      "python -u /hello/ap   28 minutes ago      Up 28 minutes       5000/tcp                                                   hello_example_1
cd76c5ff9b0e        xdevops/ccs-emulator:latest   "/ccs-emulator/run-s   24 hours ago        Up 24 hours         0.0.0.0:5000->5000/tcp, 0.0.0.0:6001-6009->6001-6009/tcp   ccs-emulator
```

