var ccs = window.ccs || {};

ccs.ContainersViewModel = function() {
    var self = this;
    self.visible = ko.observable(false);
    self.containers = ko.observableArray();

    self.init = function(jso) {
        self.containers.removeAll();
        jso.forEach(function(c) {
            c.url = '/v2/containers/' + c.Id + '/json';
            if (c.NetworkSettings.PublicIpAddress == '') c.NetworkSettings.PublicIpAddress = '--';
        });
        self.containers(jso);
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
