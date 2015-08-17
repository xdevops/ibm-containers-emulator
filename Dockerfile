# Dockerfile for ccs-emulator

FROM phusion/baseimage

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y install supervisor python-virtualenv python-dev haproxy curl
RUN pip install Flask

ADD api/*.py /ccs-emulator/api/
ADD api/ccs /ccs-emulator/api/ccs

EXPOSE 5000

ADD ccsrouter /ccs-emulator/ccsrouter

EXPOSE 6001 6002 6003 6004 6005 6006 6007 6008 6009

ADD startup-services.conf /etc/supervisor/conf.d/startup-services.conf
ADD run-supervisord.sh /ccs-emulator/run-supervisord.sh

CMD ["/ccs-emulator/run-supervisord.sh"]
