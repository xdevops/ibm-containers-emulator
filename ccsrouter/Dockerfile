FROM        xdevops/base

#RUN         apt-get update
#RUN         apt-get install -y arping

RUN         rm -f /etc/nginx/sites-enabled/default
ADD         nginx.conf /etc/nginx/conf.d/nginx.conf

ADD         run-haproxy.sh /tmp/run-haproxy.sh
ADD         haproxygen.py /tmp/haproxygen.py
ADD         haproxy.cfg.tpl /tmp/haproxy.cfg.tpl

ADD         startup-services.conf /etc/supervisor/conf.d/startup-services.conf
EXPOSE      6000 6001 6002 6003 6004 6005 6006 6007 6008 6009