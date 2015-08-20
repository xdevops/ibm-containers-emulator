var ccs = window.ccs || {};

ccs.GroupsViewModel = function() {
    var self = this;
    self.visible = ko.observable(false);
    self.groups = ko.observableArray();
    self.navEntries = ko.observableArray();

    self.init = function(jso) {
        console.log(jso);
        self.groups.removeAll();
        jso.forEach(function(c) {
            c.url = '/v2/containers/groups/' + c.Id;
            //if (c.NetworkSettings.PublicIpAddress == '') c.NetworkSettings.PublicIpAddress = '--';
            c.NetworkSettings = {PublicIpAddress: '--', IpAddress: '--'};
            console.log('TODO: Created, IpAddress, PublicIpAddress, Status not part of response');
            if (c.Creation_time) {
                c.Creation_time = (new Date(c.Creation_time)).getTime() / 1000;
            }
            else
                c.Creation_time = 0;
            if (!c.Port) c.Port = '--';
            if (!c.Status) c.Status = '--';
            if (!c.Image) c.Image = '--';

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
