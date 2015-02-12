global
    daemon
    maxconn 256
    pidfile /var/run/haproxy-private.pid

defaults
    mode http
    balance roundrobin
    retries 2
    timeout connect 1000ms
    timeout client 50000ms
    timeout server 50000ms

frontend edge_svc_6000
    bind *:4000
    default_backend default.edge_svc_6000

backend default.edge_svc_6000
{servers_6000}

frontend edge_svc_6001
    bind *:4001
    default_backend default.edge_svc_6001

backend default.edge_svc_6001
{servers_6001}

frontend edge_svc_6002
    bind *:4002
    default_backend default.edge_svc_6002

backend default.edge_svc_6002
{servers_6002}

frontend edge_svc_6003
    bind *:4003
    default_backend default.edge_svc_6003

backend default.edge_svc_6003
{servers_6003}

frontend edge_svc_6004
    bind *:4004
    default_backend default.edge_svc_6004

backend default.edge_svc_6004
{servers_6004}

frontend edge_svc_6005
    bind *:4005
    default_backend default.edge_svc_6005

backend default.edge_svc_6005
{servers_6005}

frontend edge_svc_6006
    bind *:4006
    default_backend default.edge_svc_6006

backend default.edge_svc_6006
{servers_6006}

frontend edge_svc_6007
    bind *:4007
    default_backend default.edge_svc_6007

backend default.edge_svc_6007
{servers_6007}

frontend edge_svc_6008
    bind *:4008
    default_backend default.edge_svc_6008

backend default.edge_svc_6008
{servers_6008}

frontend edge_svc_6009
    bind *:4009
    default_backend default.edge_svc_6009

backend default.edge_svc_6009
{servers_6009}

listen admin
    bind *:8080
    stats enable
