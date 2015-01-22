Testing with mock_ccsapi
=====================================

MOCK_CCSAPI is a shim that implements the [CCSAPI](https://github.rtp.raleigh.ibm.com/project-alchemy/ccsapi) on top of a local Docker environment.

To use, first

    ./run.sh
   
... to start the service.  

Using the web UI
=====================================

Point your browser to [http://localhost:5000/v2/containers/json](http://localhost:5000/v2/containers/json)
or [http://localhost:5000/v2/containers/groups](http://localhost:5000/v2/containers/groups).

Testing with *ice* CLI
=====================================


Use the [ice](https://github.rtp.raleigh.ibm.com/project-alchemy/ccscli) CLI to log in

    ice login --host http://localhost:5000 --key `whoami`-token
    # `whoami`-token just generates a dummy, which ice needs and is helpful for logging and simulating multi-user function.
   
At this point, you may invoke ice commands which will operate against your local Docker environment.

    ice ps
    ice images

Terminating mock_ccsapi
=====================================
   
When you are finished testing, to shut down MOCK_CCSAPI, do control-C.  Then

    ps aux | grep "python api/app.py"
    
to get the PID.  Then do

    kill <pid>

If you are feeling brave, the one-liner is

    kill `ps aux | grep "python api/app.py" | awk '{ print $2 }' | sort | head -n 1`
    
Configuring for *boot2docker*
=====================================

mock_ccsapi only speaks HTTP, not HTTPS, so it is important that Docker be exposed via HTTP.

To do this with [boot2docker](http://boot2docker.io),

    boot2docker ssh
    sudo su
    vi /var/lib/boot2docker/profile

The file may not exist, if so it is fine as long as we add 

    DOCKER_TLS=no
    DOCKER_HOST:='-H tcp://0.0.0.0:2375'

then restart boot2docker

    boot2docker halt
    boot2docker up
    
At this point, boot2docker will suggest new environment settings for `docker` itself.

Recent boot2docker images configurations use the IANA Docker ports of 2375 (HTTP) and 2376 (TLS).
mock_ccsapi is defaults to 4243, so to work with newer Docker defaults you must change this

    export DOCKER_REMOTE_HOST=localhost:2375
    ./run.sh
    
