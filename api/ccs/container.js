var ccs = window.ccs || {};

ccs.ContainerViewModel = function() {
    var self = this;
    self.visible = ko.observable(false);

    self.DOCKER_MAXSHARES = 1024;
    self.jso = {};
    self.name = ko.observable();
    self.cpu = ko.observable();
    self.memory = ko.observable();
    self.image = ko.observable();
    self.publicIP = ko.observable();
    self.privateIP = ko.observable();
    self.created = ko.observable();

    /*
    FROM MOCK_CCSAPI python source:

    # Return one of: 'Running' | 'NOSTATE' | 'Shutdown' | 'Crashed' | 'Paused' | 'Suspended'
    # Note: 'Paused' and "Running' are clear but,
    #  how do "docker create", "docker kill", "docker stop" and "exited container" map to 'Shutdown', 'Crashed', 'Suspended', 'NOSTATE' ?
    #  Answers from Paulo:
    #    1. 'Suspended' is a Nova state that will never happen (should probably remove from ccs api)
    #    2. 'Shutdown' for stopped container (/v/container/id/stop)
    #    3. 'Crashed' for container that has exited
    if container_json["State"]["Paused"]:
        return "Paused"
    if not container_json["State"]["Restarting"]:
        if container_json["State"]["Running"]:
            return "Running"
        if container_json["State"]["OOMKilled"]: # Out Of Memory"
            return "Crashed"
        if container_json["State"]["ExitCode"]:
            return "Crashed"
        else:
            return "Shutdown"
    return "NOSTATE"
    */
    self.stateInfo = ko.pureComputed(function() {
        var value = {state: 'UNKNOWN', icon: 'fa fa-lg fa-question-circle', style: 'black'};
        var s = self.jso.State;

        if (s.Paused)
            value = {state: 'Paused', icon: 'fa fa-lf fa-pause', style: 'color: yellow'};
        else if (!s.Restarting) {
            if (s.Running)
                value = {state: 'Running', icon: 'fa fa-lf fa-check-circle', style: 'color: green'};
            else if (s.OOMKilled)
                value = {state: 'Crashed', icon: 'fa fa-lg fa-bomb', style: 'color: red'};
            else {
                if (s.ExitCode)
                    value = {state: 'Crashed', icon: 'fa fa-lg fa-bomb', style: 'color: red'};
                else
                    value = {state: 'Shutdown', icon: 'fa fa-lf fa-stop', style: 'color: black'};
            }
        } else
            value = {state: 'Restarting', icon: 'fa fa-lf fa-spinner fa-spin', style: 'color: lightgreen'};

        return value;
    });

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

    self.allowedActions = ko.pureComputed(function() {
        var actions = [];
        var state = self.stateInfo().state;

        if (state == 'Running')
            actions = [
                {css: "pull-right fa fa-lg fa-inverse fa-times", method: self.doDelete, enable: false},
                {css: "pull-right fa fa-lg fa-stop", method: self.doStop, enable: true},
                {css: "pull-right fa fa-lg fa-pause", method: self.doPause, enable: true},
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
        else if (state == 'Paused')
            actions = [
                {css: "pull-right fa fa-lg fa-inverse fa-times", method: self.doDelete, enable: true},
                {css: "pull-right fa fa-lg fa-stop", method: self.doStop, enable: false},
                {css: "pull-right fa fa-lg fa-pause", method: self.doPause, enable: false},
                {css: "pull-right fa fa-lg fa-repeat", method: self.doRestart, enable: false},
                {css: "pull-right fa fa-lg fa-play", method: self.doUnpause, enable: true} // UNPAUSE - not Start
            ];
        else if (state == 'Crashed')
            actions = [
                {css: "pull-right fa fa-lg fa-inverse fa-times", method: self.doDelete, enable: true},
                {css: "pull-right fa fa-lg fa-stop", method: self.doStop, enable: false},
                {css: "pull-right fa fa-lg fa-pause", method: self.doPause, enable: false},
                {css: "pull-right fa fa-lg fa-repeat", method: self.doRestart, enable: true},
                {css: "pull-right fa fa-lg fa-play", method: self.doStart, enable: false}
            ];
        else if (state == 'Shutdown')
            actions = [
                {css: "pull-right fa fa-lg fa-inverse fa-times", method: self.doDelete, enable: true},
                {css: "pull-right fa fa-lg fa-stop", method: self.doStop, enable: false},
                {css: "pull-right fa fa-lg fa-pause", method: self.doPause, enable: false},
                {css: "pull-right fa fa-lg fa-repeat", method: self.doRestart, enable: true},
                {css: "pull-right fa fa-lg fa-play", method: self.doStart, enable: true}
            ];
        else
            ;

        return actions;
    });

    self.monitor = new ccs.Monitor();

    self.init = function(jso) {
        self.jso = jso;
        self.name(jso.Name.replace('/',''));

        var cpu_shares = jso.Config.CpuShares;
        if (cpu_shares == 0) cpu_shares = self.DOCKER_MAXSHARES;
        var cpu_percent = (100 * cpu_shares / self.DOCKER_MAXSHARES).toPrecision(3);

        self.cpu(cpu_percent);
        self.memory(jso.Config.Memory);
        self.image(jso.Config.Image);
        self.privateIP(jso.NetworkSettings.IPAddress);
        self.publicIP('--');
        self.created(jso.Created);

        self.monitor.init(self.jso.Id);
    };
}
