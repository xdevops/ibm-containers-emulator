# Dockerfile for mock-ccsapi

FROM ubuntu:14.04

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y install supervisor python-virtualenv python-dev haproxy curl

ADD api/*.py /mock_ccsapi/api/

EXPOSE 5000

ADD ccsrouter /mock_ccsapi/ccsrouter

EXPOSE 6000 6001 6002 6003 6004 6005 6006 6007 6008 6009

ADD setup.py /mock_ccsapi/setup.py
WORKDIR /mock_ccsapi
RUN python setup.py install

ADD startup-services.conf /etc/supervisor/conf.d/startup-services.conf

ADD run-supervisord.sh /mock_ccsapi/run-supervisord.sh
CMD ["/mock_ccsapi/run-supervisord.sh"]
