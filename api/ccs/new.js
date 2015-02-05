var ccs = window.ccs || {};

ccs.NewViewModel = function() {
    var self = this;
    self.visible = ko.observable(false);

    self.registryURL = ccs.endpoint + '/v2/containers/images';

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
        minContainers: ko.observable(2),
        maxContainers: ko.observable(2),
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
        volumes: ko.observableArray(),
        availableVolumes: ko.observableArray([
            'Exiting Volume 1',
            'Exiting Volume 2',
            'Exiting Volume 3',
            'Exiting Volume 4',
            'Exiting Volume 5',
        ]),
        dockerRepos: ko.observableArray([
            {name: 'Your Image Registry', url: window.location.origin + '/v2/containers/images/json'},
            {name: 'DockerHub', url: window.location.protocol + '//' + window.location.hostname + ':4243/images/search?term='}
        ]),
        selectedRepo: ko.observable()
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
        console.log(self.launchData.volumes());
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
                if (image.Image.toLowerCase().indexOf('<none>') == -1) {
                    var d = new Date(image.Created);
                    image.Created = d.getTime() / 1000;
                    image.VirtualSize = (image.VirtualSize/1024/1024).toFixed(0);

                    image.Name = image.Image;
                    image.Tag = '';
                    var name_tag = image.Name.split(':');
                    if (name_tag[1]) {
                        image.Name = name_tag[0];
                        image.Tag =  name_tag[1];
                    }
                    self.launchData.images.push(image);
                }
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
                     "Name": "MyGroup3",
                     "Memory":0,
                     "CpuShares": 512,
                     "Env":null,
                     "Cmd":[
                             "date"
                     ],
                     "Image":"keeper",
                     "WorkingDir":"",
                     "RestartPolicy": { "Name": "always", "HealthCheckType" : "HttpHealthCheck", "HealthCheckUrl":"/ping" },
                     "NumberInstances": {"Desired":"2", "Min" : 1, "Max" : 4},
                     "AutoScalingPolicy" : {}
                   }
            ```
            */
            console.log('TODO - check min<max and min <= desired <= max, and all positive');
            console.log('TODO - cannot create group from image in DockerHub repo');

            var jso = {
                Name: self.launchData.name(),
                Memory: 0,
                CpuShares: 512,
                Cmd: [],
                Image: self.launchData.image().Image,
                WorkingDir: "",
                RestartPolicy: { Name: "always", HealthCheckType : "HttpHealthCheck", HealthCheckUrl:"/ping" },
                NumberInstances: {Desired: self.launchData.desiredContainers(), Min : self.launchData.minContainers(), Max : self.launchData.maxContainers()},
                AutoScalingPolicy : {},
                Env: null
            }

            $.ajax({
                type: 'POST',
                url: ccs.endpoint + '/v2/containers/groups/create',
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
                     "Env": "key1=value1,key2=value2",
                     "Image":"ubuntu",
                     "Expose": [22, 80],
                     "BluemixApp": "bluemix-app-name"
                }
            ```
            */
            var jso = {
                Name: self.launchData.name(),
                Memory: self.launchData.selectedSize().memory_MB,
                Env: "",
                Image: self.launchData.image().Image,
                BluemixApp: ""
            };

            var endpoint = ccs.endpoint + '/v2/containers/create';
            if (jso.Name) endpoint += '?' + jso.Name;
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
    };

};
