var ccs = window.ccs || {};

// set defaults on all ajax async calls
$.ajaxSetup({timeout: 10*1000});

// grab global nav
var header_url = "/v2/header";
$.ajax({
    type: "GET",
    url: header_url,
    headers: {
        "Content-Type": "text/html",
        "X-Auth-Token": $context.auth_token,
        "Access-Control-Allow-Origin": "localhost:5000"
    }
}).done(function(data) {
    $("header").replaceWith(data);
});

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
        {name: 'new', type: 'new'},
        {name: 'containers', type: 'containers'},
        {name: 'groups', type: 'groups'},
        {name: 'container', type: 'container'},
        {name: 'group', type: 'group'}
    ]
};
ViewManager.init(mapper, 'ccs', ['ccs']);
ViewManager.showView($context.resource_type, $context.jso);
