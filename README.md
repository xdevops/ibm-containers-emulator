Testing with mock_ccsapi
=====================================

MOCK_CCSAPI is a shim that implements the CCSAPI on top of a local Docker environment.

To use, first

    ./run.sh
   
... to start the service.  Then use the `ice` CLI to log in

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
    