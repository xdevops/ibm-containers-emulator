var ccs = window.ccs || {};

ccs.createdText = function(created) {
    var t = Math.floor(Date.now()/1000) - created;
    var val = '--';

    var days = Math.floor(t / (60*60*24));
    if (days > 0) return days + ' days ago';

    var hours = Math.floor(t / (60*60));
    if (hours > 0) return hours + ' hours ago';

    var minutes = Math.floor(t / 60);
    if (minutes > 0) return minutes + ' minutes ago';

    return t + ' seconds ago';
}

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
};

ccs.Monitor = function() {
    var self = this;
    self.resource_id = null;

    self.update = function() {
        // get the monitoring sample data and plot it
        var mon_url = 'http://158.85.90.250/render?target=1f858a54939f464d8df6f024b0b48f9a_2b8fa024-f8a3-46d2-ba63-056906bffd45_9a244d43-a138-44bb-b186-15518c30ce0a.memory.memory-used&format=json&from=-30min&to=-1min';

        $.getJSON(mon_url, function(data) {
            var datapoints = data[0].datapoints;
            var morris_data = [];
            datapoints.forEach(function(e) {
                var mem = (e[1]/1024/1024).toPrecision(2);
                var t = e[0];
                morris_data.push({time: t, memory: mem});
            });
            new Morris.Line({
              // ID of the element in which to draw the chart.
              element: 'myfirstchart',
              // Chart data records -- each entry in this array corresponds to a point on
              // the chart.
              data: morris_data,
              // The name of the data record attribute that contains x-values.
              xkey: 'time',
              // A list of names of data record attributes that contain y-values.
              ykeys: ['memory'],
              // Labels for the ykeys -- will be displayed when you hover over the
              // chart.
              labels: ['Mb']
            });
        });
    };

    self.init = function(id) {
        self.resource_id = id;
        self.update();
        console.log('TODO - update monitor in real time');
    };
}
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

    self.state = ko.pureComputed(function() {
        var value = 'UNKNOWN';
        var s = self.jso.State;
        if (s.Running) value = 'Running';
        else if (s.Paused) value = 'Paused';
        else if (s.Restarting) value = 'Restarting';
        else if (s.Error) value = 'Crashed';
        else if (s.ExitCode) value = 'Shutdown'

        return value;
    });

    self.stateIcon = ko.pureComputed(function() {
        var value = 'fa fa-lg fa-question-circle';
        var s = self.jso.State;
        if (s.Running) value = 'fa fa-lf fa-check-circle';
        else if (s.Paused) value = 'fa fa-lf fa-pause';
        else if (s.Restarting) value = 'fa fa-lf fa-spinner fa-spin';
        else if (s.Error) value = 'Crashed';
        else if (s.ExitCode) value = 'fa fa-lf fa-stop'

        return value;
    });

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

        var monitor = new ccs.Monitor();
        monitor.init(self.jso.Id);
    };
}

//
// The mapper hash uses a convention over configuration approach to create, bind, and track viewmodels
//
// A hash with a name of 'xyz' should have a viewmodel function XyzViewModel, and an HTML div id of page-xyz
// Viewmodel function objects are contained within a namespace which is passed into ViewManager.init
//
// For example, in the namespace xdo the hash element with name 'systems' means there is an xdo.SystemsViewModel function object
//
var mapper = {
    containers: [],
    types: [
        {name: 'containers', type: 'containers'},
        {name: 'container', type: 'container'},
    ]
};
ViewManager.init(mapper, 'ccs', ['ccs']);
ViewManager.showView($context.resource_type, $context.jso);
