var ccs = window.ccs || {};

ccs.NewViewModel = function() {
    var self = this;
    self.visible = ko.observable(false);

    self.step2 = ko.observable(false); // wizard page
    self.next = function() {
        self.step2(true);
    };

    self.back = function() {
        self.step2(false);
    };

    self.Volume = function() {
        return {
            name: ko.observable(),
            size: 20,
            path: ko.observable(),
            readOnly: ko.observable(),
        };
    };

    // TODO: API call needed to get available CF Apps
    self.availableCFApps = ko.observableArray();

    // editable fields for launch wizard
    self.launchData = {
        name: ko.observable(),
        filter: ko.observable(),
        image: ko.observable(),
        imageName: ko.observable(),
        images: ko.observableArray(),
        minContainers: ko.observable(0),
        maxContainers: ko.observable(8),
        desiredContainers: ko.observable(2),
        availableSizes: ko.observableArray(),
        selectedSize: ko.observable(),
        deploymentMethods: [
            {name: 'container', label: 'Deploy as a single container'},
            {name: 'group', label: 'Deploy as a scalable group'}
        ],
        selectedDeploymentMethod: ko.observable(),
        publicIP: ko.observable('--'),
        ports: ko.observable(),
        httpPort: ko.observable(),
        SSHkey: ko.observable(),
        volumes: ko.observableArray(),
        availableVolumes: ko.observableArray(),
        dockerRepos: ko.observableArray([
            {name: 'Your Image Registry', url: window.location.origin + '/v2/images/json'}
        ]),
        selectedRepo: ko.observable(),
        selectedBluemixApp: ko.observable(),

    };
    self.launchData.selectedRepo(self.launchData.dockerRepos()[0]);

    self.launchData.isGroup = ko.pureComputed(function() {
        return self.launchData.selectedDeploymentMethod().name == 'group';
    });

    self.launchData.isGroupText = ko.pureComputed(function() {
        return self.launchData.selectedDeploymentMethod().name == 'group' ? 'Yes' : 'No';
    });

    self.launchData.route = ko.pureComputed(function() {
        if (self.launchData.selectedDeploymentMethod().name == 'container') return '--';

        var host = self.launchData.name();
        return host ? host + '.mybluemix.net' : '--';
    });

    self.launchData.deleteVolume = function(v) {
        v.name('');
        v.path('');
    };

    self.launchData.showVolumesDialog = function() {

    };

    self.launchData.updateVolumes = function() {
    }

    self.launchData.filteredImages = ko.pureComputed(function() {
        var filter = self.launchData.filter();
        if (!filter) {
            return self.launchData.images();
        } else {
            filter = filter.trim().toLowerCase();
            return ko.utils.arrayFilter(self.launchData.images(), function(item) {
                return (item.Name.toLowerCase().indexOf(filter) != -1);
            });
        }
    }, self);

    self.launchData.setImage = function(image) {
        self.launchData.image(image);
        self.launchData.imageName(image.Name + ':' + image.Tag);
    };

    self.launchData.searchImageRepository = function() {
        var filter = self.launchData.filter();
        if (filter) {
            self.launchData.getContainerImages(filter);
        }
    };

    self.launchData.repoChanged = function() {
        self.launchData.images.removeAll();
        self.launchData.filter('');
        self.launchData.getContainerImages();
    };

    self.launchData.getContainerImages = function(query) {
        var localRepoCallback = function(data) {
            self.launchData.images.removeAll();
            data.forEach(function(image) {
                var image = image;
                image.RepoTags.forEach(function(r) {
                    if (r.indexOf('<none>') !== -1) return; // filter no-name images

                    var name = r.split(':');
                    if (image.VirtualSize && image.VirtualSize > 1024 * 1024)
                        image.VirtualSize = (image.VirtualSize/1024/1024).toFixed(0);
                    else
                        image.VirtualSize = '--';
                    image.Name = name[0] || '';
                    image.Tag =  name[1] || '';
                    self.launchData.images.push(image);
                    console.log(image);
                });
            });

            $("body").css("cursor", "default");
        };

        var remoteRepoCallback = function(data) {
            self.launchData.images.removeAll();
            data.forEach(function(elem) {
                var image = elem;
                image.Name = elem.name;
                image.Created = 0;
                image.Id = '--';
                self.launchData.images.push(image);
            });

            $("body").css("cursor", "default");
        };

        $("body").css("cursor", "progress");

        var docker_api_url = self.launchData.selectedRepo().url;
        var callback = localRepoCallback;
        if (self.launchData.selectedRepo().name == 'DockerHub') {
            if (!query) query = 'base';
            docker_api_url += query.trim();
            callback = remoteRepoCallback
        }

        $.ajax({
          dataType: "json",
          url: docker_api_url,
          headers: {"X-Auth-Token": $context.auth_token},
          success: callback
        });
    };

    self.launchData.getUsage = function() {
        var usage_api_url = ccs.endpoint + '/v2/containers/usage';

        var callback = function(data) {
            var sizes = [];

            //
            // TODO - clean up
            // patch the available sizes with display text for units and convert MB to GB
            // if larger than 1k. size.memory is the display value, size.memory_MB is the value
            // to use in a POST
            //
            data.AvailableSizes.forEach(function(size) {
                size.vcpus += ' CPU';
                size.disk += ' GB';
                if (size.memory_MB >= 1024)
                    size.memory = (size.memory_MB / 1024) + ' GB';
                else
                    size.memory += ' MB';
            });
            self.launchData.availableSizes(data.AvailableSizes);
            self.launchData.selectedSize(self.launchData.availableSizes()[0]);
        };

        $.ajax({
          dataType: "json",
          url: usage_api_url,
          headers: {"X-Auth-Token": $context.auth_token},
          success: callback
        });
    };

    self.launchData.launch = function() {
        if (self.launchData.isGroup()) {
            // POST /v2/containers/groups/create
            /*


            ```json
                   {
                     "Name" : "MyGroup",
                     "Memory" : 256,
                     "Env" : { "key1" : "value1", "key2" : "value2" },
                     "Cmd" : "/bin/bash -c 'echo hello > /tmp/foo.txt'",
                     "Image" : "ubuntu:latest",
                     "Port" : 80,
                     "NumberInstances" : { "Desired" : "2", "Min" : 1, "Max" : 4 }
                   }
            ```
            */
            console.log('TODO - check min<max and min <= desired <= max, and all positive');
            console.log('TODO - cannot create group from image in DockerHub repo');

            var jso = {
                Name: self.launchData.name(),
                Memory: self.launchData.selectedSize().memory_MB,
                Image: self.launchData.image().Image,
                Port: self.launchData.httpPort(),
                NumberInstances: {Desired: self.launchData.desiredContainers(), Min : self.launchData.minContainers(), Max : self.launchData.maxContainers()},
            }

            $.ajax({
                type: 'POST',
                url: ccs.endpoint + '/v2/containers/groups',
                headers: {
                    "Content-Type":"application/json",
                    "X-Auth-Token": $context.auth_token
                },
                data: JSON.stringify(jso)
            }).done(function(data, textStatus, xhr) {
                window.location = '/v2/containers/groups';
            });
        }
        else {
            // POST /v2/containers/create?{name}
            /*

            ```json
                {
                     "Memory": 256,
                     "Env" : { "key1" : "value1", "key2" : "value2" },
                     "Cmd" : "/bin/bash -c 'echo hello > /tmp/foo.txt'",
                     "KeyName": "ssh-rsa ABBAB3NzaC1yc2EAAKWAAQABAAABAQC6tWjmNEjvxg8/kQKs+hXXhQZYmeGWInVYOptB0AAU7BLzt68XAuxuaqIEXbnUaUQOHgeaDVgt3FMLpkkZ39GcCeB1ix7LK/pSG5JPmueb/2FGC8Hdl8QTqq1nghLNbY97wUvJzRWZBBtCQ7GJFVldTyRV/997rX0l20o8OCydpdc1opUgLJ6IAAmsBPYVV4nqpy7t/NqiWudv94NrQx1Qpm/n/BAu4c3MGSdvZiLCS3knzPB9WNPt/hDqKgGKTBux5rcx4IHMQEY2g9uoL6J+xn5rRVezjxZHdYagBDXjFwCxjFU5jmfbzcqFZ/rHDuAz2YtyFZqw+8q2iO7B+Xav user@system.local"
                     "Image":"ubuntu",
                     "Expose": [22, 80],
                     "BluemixApp": "bluemix-app-name"
                }
            ``
            */
            var jso = {
                /* TODO: add Env, Cmd, KeyName, BluemixApp */
                Name: self.launchData.name(),
                Memory: self.launchData.selectedSize().memory_MB,
                Image: self.launchData.image().Image
            };
            if (self.launchData.selectedBluemixApp())
                jso['BluemixApp'] = self.launchData.selectedBluemixApp();
            if (self.launchData.SSHkey())
                jso['KeyName'] = self.launchData.SSHkey();

            var endpoint = ccs.endpoint + '/v2/containers/create';
            if (jso.Name) endpoint += '?name=' + jso.Name;
            $.ajax({
                type: 'POST',
                url: endpoint,
                headers: {
                    "Content-Type":"application/json",
                    "X-Auth-Token": $context.auth_token
                },
                data: JSON.stringify(jso)
            }).done(function(data, textStatus, xhr) {
                window.location = '/v2/containers/json?all=1';
            });
        }

    };

    self.launchData.launchText = ko.pureComputed(function() {
        return self.launchData.isGroup() ? 'Launch Group' : 'Launch Container';
    });

    self.init = function(jso) {
        self.step2(false);

        self.launchData.getContainerImages();
        self.launchData.getUsage();
        self.launchData.selectedDeploymentMethod(self.launchData.deploymentMethods[0]);
        self.launchData.ports("80, 443");
        self.launchData.httpPort('80');

        self.launchData.volumes.push(new self.Volume());
        self.launchData.volumes.push(new self.Volume());
        self.launchData.volumes.push(new self.Volume());
        self.launchData.volumes.push(new self.Volume());
        self.launchData.volumes.push(new self.Volume());

        // TODO
        console.log('TODO - get available volumes');
        console.log('TODO - get path to registry if it isnt /v2/containers/images');
    };

};
