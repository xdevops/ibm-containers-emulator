var ccs = window.ccs || {};

ccs.GroupsViewModel = function() {
    var self = this;
    self.visible = ko.observable(false);
    self.groups = ko.observableArray();

    self.init = function(jso) {
        self.groups.removeAll();
        jso.forEach(function(c) {
            c.url = '/v2/containers/groups/' + c.Id;
            //if (c.NetworkSettings.PublicIpAddress == '') c.NetworkSettings.PublicIpAddress = '--';
            c.NetworkSettings = {PublicIpAddress: '--', IpAddress: '--'};
            console.log('TODO: Created, IpAddress, PublicIpAddress, Status not part of response');
            if (!c.Created) c.Created = 0;
            c.Ports = '--';
            c.Status = '--'
        });
        self.groups(jso);
    };

    self.gotoLaunchWizard = function() {
        window.location = '/v2/containers/new';
    };

    self.deleteGroup = function(g) {
        // step 1 - HTTP DELETE the group
        // step 2 - remove the group from the observableArray
        $.ajax({
            url: g.url,
            type: 'DELETE',
            success: function(result) {
                self.groups.remove(function(group) {
                    return g.Id == group.Id;
                });
            }
        });
    };
};
