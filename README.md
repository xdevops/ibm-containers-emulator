# Bluemix IBM Containers Emulator

IBM Containers Emulator provides a simple (localhost) implementation of the IBM Containers API, specifically http://ccsapi-doc.mybluemix.net/#!/Containers and http://ccsapi-doc.mybluemix.net/#!/Container_Groups.




most of the actual CCS API, allowing us to deploy the entire application on our local machine which is faster and easier to debug. (**Note**: in Experiment 4, we'll deploy the exact same images to Bluemix)


This project explores multiple options for implementing an application built using the [microservices architecture pattern] (http://microservices.io).

The application is a simple ecommerce store that sells frames for eyeglasses. The application is very much a toy and does not reflect ANY considerations for deploying production quality code. Still the application forms a simple codebase to explore microservices.

Our application consists of two (2) microservices:

- cat
- cart

and two (2) "infrastructure" services:

- mongodb
- API Gateway

*Cat* manages the product catalog and contains the UI.

*Cart* manages a unique shopping cart for each browser session.

*MongoDB* is a mongo database server that the application uses for its datastore. When deploying the application to Bluemix, we use a hosted mongodb provider (MongoLabs) for this. When running locally, we use a local mongo server which we start along with the rest of the application components.
    
*API Gateway* is a reverse proxy that acts as the public endpoint for the application. It is responsible for routing HTTP requests to the microservices.

At present there are no microservices for shipping, inventory management, and account management. This may be developed in the future but the lack of them does not impact our implementation approaches.

Each microservice is implemented in Python and uses the *Flask* microframework. Other than having the requisite build packs and images there is no necessary reason why Python/Flask was selected.

## Setup

To run the following experiments, various prereqs must be installed. You can setup the prereqs yourself, or if you prefer, you can use the Vagrantfile in the root directory of this project to run a Ubuntu virtual machine which provides a sandbox with all the required prereqs (e.g., Docker, Cloud Foundry CLI and containers plug-in, CCS-Emulator, ServiceXY, Cassandra and Kong). 

Proceed as follows (**Note**:  the following assumes you have Vagrant and Git already installed):

```
 1. git clone git@github.rtp.raleigh.ibm.com:dctropea-us/microservices-bluemix.git (this project)
 2. git clone git@github.rtp.raleigh.ibm.com:frankb-ca/mock_ccsapi.git
 3. git clone git@github.rtp.raleigh.ibm.com:frankb-ca/servicexy.git
 4. cd microserives-bluemix
 5. vagrant up
 6. vagrant ssh
 7. cd /vagrant/shop
```

## Experiment 1 :: Statically configured CCS Containers (CCS-Emulator)

This experiment deploys the application as a set of statically configured Docker containers. Instead of deploying them on Bluemix, here we deploy them locally using CCS emulator. CCS emulator is an application that wraps the Docker API and implements most of the actual CCS API, allowing us to deploy the entire application on our local machine which is faster and easier to debug. (**Note**: in Experiment 4, we'll deploy the exact same images to Bluemix)

The Dockerfiles for the cat and cart microservice images are located in the cat and cart directories, respectively (see Dockerfile.ccs). They are both simple containers that run python Flask-based web server apps.

In this experiment we have no generic API Gateway service and therefore have a third image directory, gateway, that contains the Dockerfile for a statically configured NGINX server that we will be using as the API Gateway (Reverse Proxy) server for the application.

To run the application, we will simply:

 1. Build the 3 images (i.e., run "docker build" in directories cat, cart, and gateway)
 2. Start 3 container groups (one for each image)
 3. Add a route (maproute) to the GoRouter for each of the container groups

The *ccsdeploy.sh* bash script will do all of it in one shot:

```
cd <project-root>/shop # /vagrant/shop in vagrant sandbox
./ccsdeploy.sh
```

If you look at the script you'll notice that the 3 servers are mapped to routes that are simply ports on localhost (since the whole thing is running locally using CCS-Emulator).

Once started, the configuration looks like this:

![microservice example](https://github.rtp.raleigh.ibm.com/dctropea-us/microservices-bluemix/raw/master/slide1.JPG)

As you can see, the shopping application's API Gateway is at localhost:6003. Notice that the microservices, cat and cart, are also accessible via ports 6004 and 6005, although they should never be used by external clients. In a better implementation (later example) we'll make these private IPs that are only visible to internal clients within the microservices system/application.

To see the actual application in action, point your browser to http://localhost:6003/cat where you can browse the catalog:

![microservice example](https://github.rtp.raleigh.ibm.com/dctropea-us/microservices-bluemix/raw/master/screen1.JPG)

The displayed catelog of eyeglasses is managed by the cat microservice. To confirm that the cart microservice is also working, navigate to a specific product and click on the "Add To Cart" button (that will post to the cart microservice) which should result in an entry appearing in the shopping cart (at the top right corner of the screen).

## Experiment 2 :: Dynamic Service Configuration and Registration (CCS-Emulator)
