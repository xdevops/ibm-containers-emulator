var ccs = window.ccs || {};

ccs.endpoint = window.location.origin;

ccs.monitoringEndpoint = 'http://alchemyopsui.stage1.mybluemix.net';

ccs.createdText = function(created) {
    if (created == 0) return '--';

    var t = Math.floor(Date.now()/1000) - created;
    var val = '--';

    var days = Math.floor(t / (60*60*24));
    if (days > 364) {
        var years = Math.floor(days/365);
        return years + ' years ago';
    }
    if (days >= 30) {
        var months = Math.floor(days/30);
        return months + ' months ago';
    }
    if (days >=7 ) {
        var weeks = Math.floor(days/7);
        return weeks + ' weeks ago';
    }

    if (days > 0) return days + ' days ago';

    var hours = Math.floor(t / (60*60));
    if (hours > 0) return hours + ' hours ago';

    var minutes = Math.floor(t / 60);
    if (minutes > 0) return minutes + ' minutes ago';

    return t + ' seconds ago';
};

ccs.getMonitoringBody = function(id, resource_type, url, callback) {
    $.ajax({
        type: 'GET',
        url: ccs.monitoringEndpoint + '/operations?ace_config=' + JSON.stringify($context.ace_config),
        headers: {
            "Authorization": $context.auth_token,
            "resourceType": resource_type,
            "resourceId": id,
            "resourceUrl": url,
            "Content-Type":"application/json",
            "X-Auth-Token": $context.auth_token,
            "sessionID": url
        },
        timeout: 10000
    }).done(function(data, textStatus, xhr) {
        callback(data);
    }).fail(function(xhr, textStatus, err) {
        callback(null);
        console.log(err);
    });
}
