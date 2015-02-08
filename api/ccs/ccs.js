var ccs = window.ccs || {};

ccs.endpoint = window.location.origin;

ccs.monitoringEndpoint = 'http://158.85.90.250';
console.log("TODO - set CCS monitoring endpoint");

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

ccs.getMonitoringBody = function(id, resource_type, url, callback) {
    $.ajax({
        type: 'GET',
        url: ccs.monitoringEndpoint + '/operations?',
        headers: {
            "Authorization": $context.auth_token,
            "resourceType": resource_type,
            "resourceId": id,
            "resourceUrl": url,
            "Content-Type":"application/json",
            "X-Auth-Token": $context.auth_token
        },
        timeout: 10000
    }).done(function(data, textStatus, xhr) {
        callback(data);
    }).fail(function(xhr, textStatus, err) {
        callback(null);
        console.log(err);
    });
}
