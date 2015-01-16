var ViewManager = {
    views: [],
    mapper: {},
    dispatcher: null,

    find: function(name) {
        var result = null;
        this.views.forEach(function(v) {
            if (v.name == name)
                result = v.view;
        });
        return result;
    },

    // get is an alias of find
    get: function(name) {
        return this.find(name);
    },

    addView: function(name, view) {
        this.views.push({name: name, view: view});
    },

    showView: function(name, jso) {
        this.views.forEach(function(v) {
            if (v.name == name) {
                v.view.init(jso);
                v.view.visible(true);
            }
            else
                v.view.visible(false);
        });
    },

    doSwitch: function(map, type, jso) {
        var self = this;
        map.forEach(function(elem) {
            if (elem.type == type)
                self.showView(elem.name, jso);
        });
    },

    switchView: function(jso) {
        var rdf_type = jso.rdf_type.uri_string;

        if (rdf_type == LDP+'DirectContainer') {
            var membership_predicate = "ldp_isMemberOfRelation" in jso ? jso.ldp_isMemberOfRelation.uri_string : jso.ldp_hasMemberRelation.uri_string;
            this.doSwitch(this.mapper.containers, membership_predicate, jso);
        }
        else {
            this.doSwitch(this.mapper.types, rdf_type, jso);
        }

        return true;
    },

    init: function(mapper, namespace, segment_ids, Dispatcher) {
        var self = this;

        function capitalize(s) {
            return s[0].toUpperCase() + s.slice(1);
        }

        function create_and_bind_viewmodels(map) {
            map.forEach(function(elem) {
                var vm_name = capitalize(elem.name) + 'ViewModel';

                // use javascript reflection to get viewmodel object and create instance
                var vm = new window[namespace][vm_name]();


                ko.applyBindings(vm, document.getElementById('page-' + elem.name));
                self.addView(elem.name, vm);
            });
        }

        function get_resource_and_show_view(resource_url, history_tracker) {
            ld_util.get(resource_url, function(request){
                if (request.status==200) {
                    var jso = APPLICATION_ENVIRON.rdf_converter.make_simple_jso(request);
                    if (ViewManager.switchView(jso)) { // resource accepted
                        history_tracker.accept_url();
                    }
                    else { // we cannot handle this resource
                        history_tracker.decline_url();
                    }
                }
                else if (request.status==401) {
                    window.name = resource_url;
                    var resource_json = JSON.parse(request.responseText);
                    window.location.href = resource_json['http://ibm.com/ce/ns#login-page'];
                }
                else {
                    console.log( request.status );
                }
            });
        }

        // decide if this single-page-app claims a click on an element
        function claimClick(element) {
            // precondition: don't claim click with href of #xyz or ''
            var href = element.getAttribute('href');
            if (!href || href === '' || href[0] == '#')
                return false;

            var segments = element.pathname.split('/');
            var result = false;

            if (segments.length > 1) {
                segment_ids.forEach(function(segment_id) {
                    if (segments[1] == segment_id)
                        result = true;
                });
            }

            return result;
        }

        this.mapper = mapper;

        var ns = window[namespace];
        create_and_bind_viewmodels(mapper.containers);
        create_and_bind_viewmodels(mapper.types);

/*
        var DispatcherFactory = (Dispatcher === undefined) ? misc_util.Dispatcher : Dispatcher;
        var my_dispatcher = new DispatcherFactory(claimClick, get_resource_and_show_view);
        my_dispatcher.hook_history_and_links();
*/
    }
};

