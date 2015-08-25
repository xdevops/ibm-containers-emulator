FROM phusion/baseimage

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -qq && \
    apt-get install -y -q --no-install-recommends \
    python2.7 python-pip build-essential python-dev
    
RUN pip install Flask

ADD app.py /hello/app.py

EXPOSE 5000

ENTRYPOINT ["python", "-u", "/hello/app.py"]
