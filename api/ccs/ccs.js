var ccs = window.ccs || {};

ccs.endpoint = 'http://localhost:5000';

ccs.createdText = function(created) {
    if (created == 0) return '--';

    var t = Math.floor(Date.now()/1000) - created;
    var val = '--';

    var days = Math.floor(t / (60*60*24));
    if (days > 0) return days + ' days ago';

    var hours = Math.floor(t / (60*60));
    if (hours > 0) return hours + ' hours ago';

    var minutes = Math.floor(t / 60);
    if (minutes > 0) return minutes + ' minutes ago';

    return t + ' seconds ago';
};
