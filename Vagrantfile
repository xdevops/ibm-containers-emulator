# This Vagrantfile starts a Ubuntu machine sandbox environment with the following installed and running:
#   1. Docker
#   2. IBM Containers Emulator (a.k.a., ccsapi-emulator)
#   3. Cloud Foundry CLI

# -*- mode: ruby -*-
# vi: set ft=ruby :

$script = <<SCRIPT
set -x

apt-get update -qq
apt-get install -q -y curl python-pip

# Install and run Docker
echo deb http://get.docker.com/ubuntu docker main > /etc/apt/sources.list.d/docker.list
apt-key adv --keyserver pgp.mit.edu --recv-keys 36A1D7869245C8950F966E92D8576A8BA88D21E9
apt-get update
sudo wget -qO- https://get.docker.com/ | sh

sudo usermod -a -G docker vagrant # Add vagrant user to the docker group
sudo echo 'DOCKER_OPTS="-r=true --api-enable-cors=true -H tcp://0.0.0.0:2375 -H unix:///var/run/docker.sock --insecure-registry leanjazz.rtp.raleigh.ibm.com:5000 ${DOCKER_OPTS}"' > /etc/default/docker
sudo service docker restart

sudo cat >/usr/local/bin/denter <<EOF
#!/bin/sh
docker exec -it \\\$1 bash
EOF
sudo chmod +x /usr/local/bin/denter

# Install and run the ccsapi emulator
cd /vagrant && ./shutdown.sh && ./startup.sh

# Install Cloud Foundry CLI and IBM Containers plug-in
URL='https://cli.run.pivotal.io/stable?release=debian64&version=6.12.2&source=github-rel'; FILE=`mktemp`; wget "$URL" -qO $FILE && sudo dpkg -i $FILE; rm $FILE

SCRIPT

Vagrant.configure('2') do |config|
  config.vm.box = "ubuntu/trusty64"

  config.vm.network :forwarded_port, guest: 5000, host: 5000 # IBM Containers emulator (ccsapi-emulator) server
  config.vm.network :forwarded_port, guest: 6001, host: 6001 # reserved for ccsapi-emulator maproute
  config.vm.network :forwarded_port, guest: 6002, host: 6002 # reserved for ccsapi-emulator maproute
  config.vm.network :forwarded_port, guest: 6003, host: 6003 # reserved for ccsapi-emulator maproute
  config.vm.network :forwarded_port, guest: 6004, host: 6004 # reserved for ccsapi-emulator maproute
  config.vm.network :forwarded_port, guest: 6005, host: 6005 # reserved for ccsapi-emulator maproute
  config.vm.network :forwarded_port, guest: 6006, host: 6006 # reserved for ccsapi-emulator maproute
  config.vm.network :forwarded_port, guest: 6007, host: 6007 # reserved for ccsapi-emulator maproute
  config.vm.network :forwarded_port, guest: 6008, host: 6008 # reserved for ccsapi-emulator maproute
  config.vm.network :forwarded_port, guest: 6009, host: 6009 # reserved for ccsapi-emulator maproute

  config.vm.network :forwarded_port, guest: 2375, host: 2375 # docker remote host port

  config.vm.provider :virtualbox do |vb|
    vb.customize ["modifyvm", :id, "--natdnshostresolver1", "on"]
    vb.customize ['modifyvm', :id, '--memory', '2048']
    vb.cpus = 2
  end

  config.vm.provision :shell, inline: $script
end
