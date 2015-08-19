var ccs = window.ccs || {};

ccs.ContainersViewModel = function() {
    var self = this;
    self.visible = ko.observable(false);
    self.containers = ko.observableArray();
    self.navEntries = ko.observableArray();

    self.soloContainers = ko.pureComputed(function() {
        return ko.utils.arrayFilter(self.containers(), function(c) {
            return (!c.Group || !c.Group.Id);
        });
    });

    self.groups = ko.observableArray();

    self.init = function(jso) {
        self.containers.removeAll();
        self.groups.removeAll();

        jso.forEach(function(c) {
            c.url = '/v2/containers/' + c.Id + '/json';
            if (c.NetworkSettings.PublicIpAddress == '') c.NetworkSettings.PublicIpAddress = '--';
            // add flag to say whether container part of a group
            c.InGroup = c.Group && c.Group.Id ? 'yes' : 'no';
        });

        self.containers(jso);

        console.log(self.containers());

        // we get the list of groups because the dashboard UI displays both the groups and the containers without a group
        // in the "List of Containers"
        $.ajax({
            type: 'GET',
            url: ccs.endpoint + '/v2/containers/groups',
            headers: {
                "Content-Type":"application/json",
                "X-Auth-Token": $context.auth_token
            }
        }).done(function(data, textStatus, xhr) {
            function makeURL(group) { return ccs.endpoint + '/v2/containers/groups/' + group.Id; }

            var groups = JSON.parse(data);
            groups.forEach(function(group) {
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
