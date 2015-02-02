var ccs = window.ccs || {};

ccs.NewViewModel = function() {
    var self = this;
    self.visible = ko.observable(false);

    self.registryURL = ccs.endpoint + '/v2/containers/images';
    // editable fields for launch wizard
    self.launchData = {
        name: ko.observable(),
        filter: ko.observable(),
        image: ko.observable(),
        imageName: ko.observable(),
        images: ko.observableArray(),
        isGroup: ko.observable(true),
        minContainers: ko.observable(2),
        maxContainers: ko.observable(2),
        desiredContainers: ko.observable(2),
        availableSizes: ko.observableArray(),

        dockerRepos: ko.observableArray([
            {name: 'Your Image Registry', url: window.location.origin + '/v2/containers/images/json'},
            {name: 'DockerHub', url: window.location.protocol + '//' + window.location.hostname + ':4243/images/search?term='}
        ]),
        selectedRepo: ko.observable()
    };
    self.launchData.selectedRepo(self.launchData.dockerRepos()[0]);

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
        self.launchData.imageName(image.Name);
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
                var d = new Date(image.Created);
                image.Created = d.getTime() / 1000;
                image.VirtualSize = (image.VirtualSize/1024/1024).toFixed(0);
                image.RepoTags.forEach(function(tag) {
                    if (tag.indexOf('<none>') == -1) {
                        tag = tag.split(':');
                        image.Name = tag[0];
                        image.Tag = tag[1] ? tag[1] : '';
                        self.launchData.images.push(image);
                    }
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

        $.getJSON(docker_api_url, callback);
    };

    self.launchData.getUsage = function() {
        var usage_api_url = ccs.endpoint + '/v2/containers/usage';
        $.getJSON(usage_api_url, function(data) {
            self.launchData.availableSizes(data.AvailableSizes);
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
                Image: self.launchData.image().Name,
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
                    "Content-Type":"application/json"
                },
                data: JSON.stringify(jso)
            }).done(function(data, textStatus, xhr) {
                window.location = '/v2/containers/groups';
            });
        }
        else {
            // POST /v2/containers/create
            /*

            ```json
                {
                     "Memory":0,
                     "CpuShares": 512,
                     "NumberCpus": 1,
                     "Env":null,
                     "Cmd":[
                             "date"
                     ],
                     "Image":"base",
                     "WorkingDir":"",
                }
            ```
            */
            var jso = {
                Name: self.launchData.name(),
                Memory: 0,
                CpuShares: 512,
                Cmd: [],
                Env: [],
                Image: self.launchData.image().Name,
                WorkingDir: ""
            };

            $.ajax({
                type: 'POST',
                url: ccs.endpoint + '/v2/containers/create',
                headers: {
                    "Content-Type":"application/json"
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
        self.launchData.getContainerImages();
        self.launchData.getUsage();
    };

};
