var ccs = window.ccs || {};

ccs.GroupsViewModel = function() {
    var self = this;
    self.visible = ko.observable(false);
    self.groups = ko.observableArray();

    self.showList = ko.observable(true);

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

        dockerRepos: ko.observableArray([
            {name: 'Your Image Registry', url: 'http://localhost:5000/v2/containers/images'},
            {name: 'DockerHub', url:'http://localhost:4243/images/search?term='}
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
            data.forEach(function(elem) {
                var image = elem;
                elem.RepoTags.forEach(function(tag) {
                    if (tag.indexOf('<none>') == -1) {
                        image.Name = tag;
                        self.launchData.images.push(elem);
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
                console.log('POST /v2/containers/groups/create');
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
                console.log('POST /v2/containers/create');
            });
        }

    };
    self.launchData.launchText = ko.pureComputed(function() {
        return self.launchData.isGroup() ? 'Launch Group' : 'Launch Container';
    });

    self.init = function(jso) {
        self.groups.removeAll();
        jso.forEach(function(c) {
            c.url = '/v2/containers/groups/' + c.Id + '/json';
            //if (c.NetworkSettings.PublicIpAddress == '') c.NetworkSettings.PublicIpAddress = '--';
            c.NetworkSettings = {PublicIpAddress: '--', IpAddress: '--'};
            console.log('TODO: Created, IpAddress, PublicIpAddress, Status not part of response');
            if (!c.Created) c.Created = 0;
            c.Ports = '--';
            c.Status = '--'
        });
        self.groups(jso);
    };

    self.showLaunchWizard = function() {
        self.showList(false);
        self.launchData.getContainerImages();
    };
};
