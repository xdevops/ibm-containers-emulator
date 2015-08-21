var ccs = window.ccs || {};

ccs.GroupsViewModel = function() {
    var self = this;
    self.visible = ko.observable(false);
    self.groups = ko.observableArray();
    self.url = null;

    function makeURL(group) { return '/v2/containers/groups/' + group.Id; }
    function processJSO(jso) {
        jso.forEach(function(c) {
            c.url = '/v2/containers/groups/' + c.Id;
            c.NetworkSettings = {PublicIpAddress: '--', IpAddress: '--'};
            if (c.Creation_time) {
                c.Creation_time = Math.floor((new Date(c.Creation_time)).getTime() / 1000);
            }
            else
                c.Creation_time = 0;
            if (!c.Port) c.Port = '--';
            if (!c.Status) c.Status = '--';
            if (!c.Image) c.Image = '--';
        });
        return jso;
    }

    self.getGroups = function() {
        $.ajax({
            type: 'GET',
            url: '/v2/containers/groups',
            headers: {
                "Accept":"application/json",
                "X-Auth-Token": $context.auth_token
            }
        }).done(function(data, textStatus, xhr) {
            var groups = processJSO(JSON.parse(data));
            self.groups(groups);
        });
    };

    self.init = function(jso) {
        console.log(jso);
        self.url = jso._subject;
        self.groups.removeAll();
        jso = processJSO(jso);
        self.groups(jso);

        //Clear update interval if it exist
        if (self.updateInterval) clearInterval(self.updateInterval);

        //Setup new update loop with current target
        self.updateInterval = setInterval(function(){
            self.getGroups();
        }, 5000);

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
