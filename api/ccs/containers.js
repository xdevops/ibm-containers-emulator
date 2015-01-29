var ccs = window.ccs || {};

ccs.ContainersViewModel = function() {
    var self = this;
    self.visible = ko.observable(false);
    self.containers = ko.observableArray();

    self.soloContainers = ko.pureComputed(function() {
        return ko.utils.arrayFilter(self.containers(), function(c) {
            return c.Group === undefined;
        });
    });

    self.groups = ko.observableArray();

    self.init = function(jso) {
        self.containers.removeAll();
        self.groups.removeAll();

        jso.forEach(function(c) {
            c.url = '/v2/containers/' + c.Id + '/json';
            if (c.NetworkSettings.PublicIpAddress == '') c.NetworkSettings.PublicIpAddress = '--';
        });
        self.containers(jso);

        // we get the list of groups because the dashboard UI displays both the groups and the containers without a group
        // in the "List of Containers"
        $.getJSON(ccs.endpoint + '/v2/containers/groups', function(data) {
            function makeURL(group) { return ccs.endpoint + '/v2/containers/groups/' + group.Id; }

            data.forEach(function(group) {
                self.groups.push({
                    Name: group.Name,
                    Id: group.Id,
                    Image: group.Image,
                    url: makeURL(group),
                    Status: 'Active', /* TODO: get real state */
                    Created: 0 /* TODO: get real created time */
                });
            });
        });
    };

    self.containerURL = function(c) {
        var url = '/v2/containers/' + c.Id() + '/json';
        console.log(url);
        return url;
    };

    self.gotoLaunchWizard = function() {
        window.location = '/v2/containers/new';
    };
};
