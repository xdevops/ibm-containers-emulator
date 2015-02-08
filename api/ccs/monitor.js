'use strict';
var ccs = window.ccs || {};

var config = {}
config.cpu = {
  dataUrl: 'http://158.85.90.250/render?target=absolute(offset(averageSeries(ea207237-bcad-4cee-9fb2-72cf35189c71_0000_77d7d35d-4428-45f0-9c9f-6daa7c65a662.cpu-*.cpu-idle),-100))&format=json&from=-5min&to=-0min',
  dataValue: '--',
  initSpan: '&from=-4min&to=0min',
  initArray: [],
  cumulativeArray: [],
  latestDatapoint: {},
  chartElem: 'cpuChart',
  chartLabel: 'CPU Percentage',
  chartTitle: 'CPU Utilization',
  chartDesc: 'CPU Percentage Over Time (%)',
  format: function (y){
      return (Math.round(y * 100) / 100) + ' %';
      },
  chart: null
};

config.memory = {
  dataUrl: 'http://158.85.90.250/render?target=ea207237-bcad-4cee-9fb2-72cf35189c71_0000_77d7d35d-4428-45f0-9c9f-6daa7c65a662.memory.memory-used&format=json&from=-5min&to=-0min',
  dataValue: '--',
  initSpan: '&from=-4min&to=-0min',
  initArray: [],
  cumulativeArray: [],
  latestDatapoint: {},
  chartElem: 'memoryChart',
  chartLabel: 'Memory Used',
  chartTitle: 'Memory Utilization',
  chartDesc: 'Memory Usage Over Time (MB)',
  format: function (y){
      return (y/(1024*1024)).toFixed(2).toString() + ' MB';
      },
  chart: null
};

config.network = {
  dataUrl: 'http://158.85.90.250/render?target=ea207237-bcad-4cee-9fb2-72cf35189c71_0000_77d7d35d-4428-45f0-9c9f-6daa7c65a662.interface-lo.if_octets.tx&format=json&from=-5min&to=-0min',
  //dataUrl: 'http://158.85.90.250/render?target=1f858a54939f464d8df6f024b0b48f9a_56f4e462-c725-4c99-bc75-05e588de4627_6c2801e1-90c8-47b0-823e-c9cfd0dd0900.interface-eth0.if_packets.rx&format=json',
  dataValue: '--',
  initSpan: '&from=-4min&to=-0min',
  initArray: [],
  cumulativeArray: [],
  latestDatapoint: {},
  chartElem: 'networkChart',
  chartLabel: 'Network Traffic',
  chartTitle: 'Network Traffic',
  chartDesc: 'Network Usage Over Time (Bytes/sec)',
  format: function (y){
      return (Math.round(y * 100) / 100) + ' Bytes/Sec';
      },
  chart: null
};


ccs.Monitor = function() {
    var self = this;

    //Set a updateInterval handler to be used later
    self.updateInterval = null;
    self.mChart = {};
    self.chartConfig = [config.memory, config.network, config.cpu];
    self.selectedChart = ko.observable(config.memory); // default to draw memory chart

    self.chartTitle = ko.pureComputed(function() { return self.selectedChart().chartTitle; });
    self.chartLabel = ko.pureComputed(function() { return self.selectedChart().chartLabel; });
    self.chartDesc = ko.pureComputed(function() { return self.selectedChart().chartDesc; });
    self.dataValue = ko.observable('--');

    self._updateMArray = function(inputArray){
        var morrisArray = [];
        for (var i = 0; i < inputArray.length; i++) {
            var cur = inputArray[i];

            //Check if the metric_used is null, 0 it
            if(cur[0] == null || cur[0] == 'null')
              cur[0] = undefined;

            morrisArray[i] = {timestamp: cur[1], metric_used: cur[0]};
        }

        return morrisArray;
    }

    self._updateChart = function() {
        var target = self.selectedChart();

        $.get(target.dataUrl + '&from=' + target.latestDatapoint.timestamp, function (data) {
            var newDataDirty = [];
            newDataDirty = self._updateMArray(data[0].datapoints);

            var newDataClean = [];
            for (var i = 0; i < newDataDirty.length; i++) {
                if (newDataDirty[i].timestamp > target.latestDatapoint.timestamp) newDataClean.push(newDataDirty[i]);
            }

            //To prevent data being messed up, only do the following if the temp[0] is newer than current latestDatapoint
            if(newDataClean.length > 0) {
                //Remove the first temp.length element
                target.cumulativeArray.splice(0, newDataClean.length);
                //Append items in temp at the end of array
                for (var i = 0; i < newDataClean.length; i++) {
                    target.cumulativeArray.push(newDataClean[i]);
                }

                //Set latest datapoint
                var len = target.cumulativeArray.length - 1;
                while (len >= 0 && target.cumulativeArray[len].metric_used == undefined) len--;

                target.latestDatapoint = target.cumulativeArray[target.cumulativeArray.length-1];
                self.dataValue(target.format(target.cumulativeArray[len].metric_used));
            }
        });
    }

    self._drawChart = function() {
        var target = self.selectedChart();

        //Draw the main chart
        $.ajaxSetup({timeout:1000});
        $.get(target.dataUrl+target.initSpan, function (data) {
            //Clear the chart first
            $('#mChart').html('');

            target.initArray = self._updateMArray(data[0].datapoints.slice());
            target.cumulativeArray = self._updateMArray(data[0].datapoints.slice());

            self.mChart = Morris.Line({
                axes: 'xy',
                grid: false,
                element: 'mChart',
                data: target.cumulativeArray,
                xkey: 'timestamp',
                ykeys: ['metric_used'],
                labels: [target.chartLabel],
                ymax: 'auto',
                ymin: 'auto',
                lineColors: ['#8cc540'],
                pointFillColors: ['#ffffff'],
                pointStrokeColors: ['#8cc540'],
                hideHover: 'true',
                yLabelFormat: target.format,
                dateFormat: function (x) {
                    var datetime = new Date(x*1000);
                    return datetime.toLocaleString();
                }
            });

            //Set latest datapoint
            var len = target.cumulativeArray.length - 1;
            while (len >= 0 && target.cumulativeArray[len].metric_used == undefined) len--;

            target.latestDatapoint = target.cumulativeArray[target.cumulativeArray.length-1];
            self.dataValue(target.format(target.cumulativeArray[len].metric_used));

            //Clear update interval if it exist
            if (self.updateInterval) clearInterval(self.updateInterval);

            //Setup new update loop with current target
            self.updateInterval = setInterval(function(){
              self._updateChart(target);
            }, 10000);
        });
    }

    self.changeChart = function(c) {
        self.selectedChart(c);
        self._drawChart();
    };

    self.init = function() {
        self._drawChart();
    };
};
