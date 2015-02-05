var ccs = window.ccs || {};

ccs.GroupViewModel = function() {
    var self = this;
    self.visible = ko.observable(false);

    self.DOCKER_MAXSHARES = 1024;
    self.jso = {};
    self.name = ko.observable();
    self.cpu = ko.observable();
    self.memory = ko.observable();
    self.image = ko.observable();
    self.port = ko.observable();
    self.status = ko.observable();
    self.route = ko.observable();
    self.volumes = ko.observableArray();
    self.containers = ko.observableArray();

    // POST /{version}/containers/{id}/start
    self.doStart = function() {
        var url = self.jso._subject.replace('/json', '/start'); // TODO: kludge doing url synthesis
        $.post(url, function(data, status, xhr) {
            console.log(status);
        });
    };

    // POST /{version}/containers/{id}/stop{?t}
    self.doStop = function() {
        var url = self.jso._subject.replace('/json', '/stop?t=5'); // TODO: kludge doing url synthesis
        $.post(url, function(data, status, xhr) {
            console.log(status);
        });
    };

    // POST /{version}/containers/{id}/restart{?t}
    self.doRestart = function() {
        var url = self.jso._subject.replace('/json', '/restart'); // TODO: kludge doing url synthesis
        $.post(url, function(data, status, xhr) {
            console.log(status);
        });
    };

    //POST /{version}/containers/{id}/pause
    self.doPause = function() {
        var url = self.jso._subject.replace('/json', '/pause'); // TODO: kludge doing url synthesis
        $.post(url, function(data, status, xhr) {
            console.log(status);
        });
    };

    //POST   /{version}/containers/{id}/unpause
    self.doUnpause = function() {
        var url = self.jso._subject.replace('/json', '/unpause'); // TODO: kludge doing url synthesis
        $.post(url, function(data, status, xhr) {
            console.log(status);
        });
    };

    //DELETE /{version}/containers/{id}
    self.doDelete = function() {
        var url = self.jso._subject.replace('/json', ''); // TODO: kludge doing url synthesis
        function callback(data, status, xhr) {
            if (status == 'nocontent') {
                // TODO: synthesizing the containers url - fix
                var parts = url.split('/');
                var containers_url = parts[0] + '//' + parts[2] + '/v2/containers/json?all=1';
                window.location = containers_url;
            }
        }

        $.ajax({
            url: url,
            type: 'DELETE',
            success: callback
        });
    };

    self.numContainers = ko.pureComputed(function() {
        return self.containers().length;
    });

    self.stateInfo = ko.pureComputed(function() {
        var value = {state: 'UNKNOWN', icon: 'fa fa-lg fa-question-circle', style: 'black'};

        if (self.status() == 'ACTIVE')
            value = {state: 'Active', icon: 'fa fa-lf fa-check-circle', style: 'color: green'};

        return value;
    });

    self.allowedActions = ko.pureComputed(function() {
        var actions = [];
        var state = self.status();

        if (state == 'ACTIVE')
            actions = [
                {text: 'delete', css: "pull-right fa fa-lg fa-inverse fa-times", method: self.doDelete, enable: true},
                {css: "pull-right fa fa-lg fa-stop", method: self.doStop, enable: false},
                {css: "pull-right fa fa-lg fa-pause", method: self.doPause, enable: false},
                {css: "pull-right fa fa-lg fa-repeat", method: self.doRestart, enable: false},
                {css: "pull-right fa fa-lg fa-play", method: self.doStart, enable: false}
            ];
        else if (state == 'UNKNOWN')
            actions = [
                {css: "pull-right fa fa-lg fa-inverse fa-times", method: self.doDelete, enable: true},
                {css: "pull-right fa fa-lg fa-stop", method: self.doStop, enable: true},
                {css: "pull-right fa fa-lg fa-pause", method: self.doPause, enable: true},
                {css: "pull-right fa fa-lg fa-repeat", method: self.doRestart, enable: true},
                {css: "pull-right fa fa-lg fa-play", method: self.doStart, enable: true}
            ];
        else
            ;

        return actions;
    });

    self.monitor = new ccs.Monitor();

    self.init = function(jso) {
        console.log('TODO - HACK for groups detail - check with real API');

        self.jso = jso;
        self.name(jso.Name.replace('/',''));

        var cpu_percent = 100; //TODO - fix this
        self.cpu(cpu_percent);
        self.memory(jso.Memory);
        self.image(jso.Image);

        self.status('ACTIVE'); // TODO - this has to be computed
        self.port = jso.Port;
        self.route('--'); // TODO this has to be retrieved
        self.volumes([]); // TODO this has to be retrieved

        // have to make another API call to get containers
        // /v2/containers/json?group={id}
        var url = ccs.endpoint + '/v2/containers/json?group=' + jso.Id;
        $.getJSON(url, function(containers) {
            containers.forEach(function(c) {
                c.url = '/v2/containers/' + c.Id + '/json';
            });
            self.containers(containers);
        });

        self.monitor.init(self.jso.Id);
    };
};
