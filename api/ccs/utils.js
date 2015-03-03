ld_util = (function () {

    function set_headers(headers, request) {
        if (headers) {
            for (header in headers) {
                var header_value = headers[header]
                if (Array.isArray(header_value)) {
                    for (var i = 0; i < header_value.length; i++) {
                        request.setRequestHeader(header, header_value[i])
                        }
                    }
                else {
                    request.setRequestHeader(header, header_value)
                    }
                }
            }
        }

    function hasHeader(headers, header) {
        for (hdr in headers) {
            if (hdr.toLowerCase() == header.toLowerCase()) {return true}
            }
        return false
        }

    function get(resource_url, handle_result, headers) {
        resource_url = resource_url.toString()
        if (resource_url.indexOf('http:') === 0) {resource_url = resource_url.slice(5)} // don't force http if the browser is doing https
        else if (resource_url.indexOf('https:') === 0) {resource_url = resource_url.slice(6)} // don't force https if the browser is doing http
        var request=new XMLHttpRequest()
        if (!!handle_result) {
            request.onreadystatechange=function() {
                if (request.readyState==4) {
                    handle_result(request) }
                }
            }
        request.open("GET", resource_url, !!handle_result);
        request.resource_url = resource_url // we will need this later to construct the rdf_util from the response
        request.withCredentials = 'true'
        headers = headers || {}
        set_headers(headers, request)
        if (!hasHeader(headers, 'Accept')) {
            request.setRequestHeader('Accept', 'application/rdf+json+ce')
            }
        request.send()
        return request
        }

    function getHTML(resource_url, handle_result, headers) {
        headers = headers || {}
        headers['Accept'] = 'text/html'
        return get(resource_url, handle_result, headers)
        }

    function getJSON(resource_url, handle_result, headers) {
        headers = headers || {}
        headers['Accept'] = 'application/json'
        return get(resource_url, handle_result, headers)
    }

    function send_transform(resource_url, input_resource, handle_result, headers) {
        resource_url = resource_url.toString()
        if (resource_url.indexOf('http:') === 0) {resource_url = resource_url.slice(5)} // don't force http if the browser is doing https
        else if (resource_url.indexOf('https:') === 0) {resource_url = resource_url.slice(6)} // don't force https if the browser is doing http
        var query_str = JSON.stringify(input_resource)
        var request=new XMLHttpRequest()
        if (!!handle_result) {
            request.onreadystatechange=function() {
                if (request.readyState==4) {
                    handle_result(request)
                    }
                }
            }
        request.open('POST',resource_url, !!handle_result)
        set_headers(headers, request)
        if (!hasHeader(headers, 'Content-type')) {
            request.setRequestHeader('Content-type', 'application/json')
            }
        //request.setRequestHeader('Content-Length', query_str.length)
        request.setRequestHeader('CE-Post-Reason', 'CE-Transform')
        request.send(query_str)
        return request
        }
    function send_create(resource_url, new_resource, handle_result, headers) {
        resource_url = resource_url.toString()
        if (resource_url.indexOf('http:') === 0) {resource_url = resource_url.slice(5)} // don't force http if the browser is doing https
        else if (resource_url.indexOf('https:') === 0) {resource_url = resource_url.slice(6)} // don't force https if the browser is doing http
        if ('_subject' in new_resource && !hasHeader(headers, 'Content-type')) {
            new_resource = APPLICATION_ENVIRON.rdf_converter.convert_to_rdf_jso(new_resource)
            }
        var json_str = JSON.stringify(new_resource)
        var request=new XMLHttpRequest()
        if (!!handle_result) {
            request.onreadystatechange=function() {
                if (request.readyState==4) {
                    handle_result(request)
                    }
                }
            }
        request.open('POST',resource_url, !!handle_result)
        set_headers(headers, request)
        if (!hasHeader(headers, 'Content-type')) {
            request.setRequestHeader('Content-type', 'application/rdf+json+ce')
            }
        request.setRequestHeader('CE-Post-Reason', 'CE-Create')
        request.send(json_str)
        return request
        }
    function send_put(resource_url, resource, handle_result, headers) {
        resource_url = resource_url.toString()
        if (resource_url.indexOf('http:') === 0) {resource_url = resource_url.slice(5)} // don't force http if the browser is doing https
        else if (resource_url.indexOf('https:') === 0) {resource_url = resource_url.slice(6)} // don't force https if the browser is doing http
        var json_str = JSON.stringify(resource)
        var request=new XMLHttpRequest()
        if (!!handle_result) {
            request.onreadystatechange=function() {
                if (request.readyState==4) {
                    handle_result(request)
                    }
                }
            }
        request.open('PUT',resource_url, !!handle_result)
        set_headers(headers, request)
        if (!hasHeader(headers, 'Content-type')) {
            request.setRequestHeader('Content-type', 'application/rdf+json+ce')
            }
        request.send(json_str)
        return request
        }
    function send_patch(resource_url, revision, patch_struct, handle_result, headers) {
        original_resource_url = resource_url = resource_url.toString()
        if (resource_url.indexOf('http:') === 0) {resource_url = resource_url.slice(5)} // don't force http if the browser is doing https
        else if (resource_url.indexOf('https:') === 0) {resource_url = resource_url.slice(6)} // don't force https if the browser is doing http
        var json_str = JSON.stringify(patch_struct)
        var request=new XMLHttpRequest()
        request.resource_url = original_resource_url // we will need this later to construct the rdf_util from the response
        if (!!handle_result) {
            request.onreadystatechange=function() {
                if (request.readyState==4) {
                    handle_result(request)
                    }
                }
            }
        request.open("PATCH", resource_url, !!handle_result)
        request.setRequestHeader('CE-Revision', revision.toString())
        set_headers(headers, request)
        if (!hasHeader(headers, 'Content-type')) {
            request.setRequestHeader('Content-type', 'application/rdf+json+ce')
            }
        //request.setRequestHeader('Content-Length', json_str.length)
        request.send(json_str)
        return request
        }
    function send_delete(resource_url, handle_result, headers) {
        resource_url = resource_url.toString()
        if (resource_url.indexOf('http:') === 0) {resource_url = resource_url.slice(5)} // don't force http if the browser is doing https
        else if (resource_url.indexOf('https:') === 0) {resource_url = resource_url.slice(6)} // don't force https if the browser is doing http
        var request = new XMLHttpRequest()
        if (!!handle_result) {
            request.onreadystatechange=function() {
                if (request.readyState==4) {
                    handle_result(request)
                    }
                }
            }
        request.open("DELETE", resource_url, !!handle_result);
        set_headers(headers, request)
        request.send()
        return request
        }

    function setInnerHTML(element, inner_HTML) {
        function forceScript(old_script_element) {
            //var new_script_element = old_script_element.cloneNode() - doesn't work - clone is inactive and will not load
            if (old_script_element.parentNode) { // if there is no parent, the script is no longer in the dom
                var new_script_element = document.createElement('script')
                var old_attributes = old_script_element.attributes
                var id_attrib = null
                for (var a_i = 0; a_i < old_attributes.length; a_i++) {
                    var attrib = old_attributes[a_i]
                    new_script_element.setAttribute(attrib.name, attrib.value)
                    }
                new_script_element.innerHTML = old_script_element.innerHTML
                old_script_element.parentNode.insertBefore(new_script_element, old_script_element)
                if (old_script_element.parentNode) { // if there is no parent, the script is no longer in the dom
                    old_script_element.parentNode.removeChild(old_script_element)
                    }
                return new_script_element
                }
            }

        function forceAllScripts(element) {
            var scripts = element.getElementsByTagName('script');
            scripts = [].slice.call(scripts, 0)
            for (var i = 0; i < scripts.length; i++) { // fire off the async ones first
                var script = scripts[i]
                if (script.hasAttribute('async') || script.hasAttribute('defer')) {
                    if (old_script_element.hasAttribute('src') || old_script_element.hasAttribute('load-src')) { // external script
                        if (script.hasAttribute('type') && scripts[i].getAttribute('type') != 'text/javascript') {
                            // external, non-javascript. Chrome, at least, will not load script elements with a type other than 'text/javascript'
                            if (script.hasAttribute('load-src')) { // user wants the load to happen anyway
                                getHTML(src_url, function(request) {
                                    if (request.status==200) {
                                        script.innerHTML = request.responseText
                                        }
                                    else {
                                        console.log('could not load script - status: ', request.status )
                                        }
                                    })
                                }
                            }
                        else { // external javascript
                            forceScript(script)
                            }
                        }
                    else { // internal script
                        forceScript(old_script_element)
                        }
                    scripts.splice(i, 1)
                    i--
                    }
                }
            // now do the sync ones in order.
            var j = 0
            function forceNextScript() {
                if (j < scripts.length) {
                    var old_script_element = scripts[j]
                    j++
                    if (old_script_element.hasAttribute('src') || old_script_element.hasAttribute('load-src')) { // external script
                        if (old_script_element.hasAttribute('type') && old_script_element.getAttribute('type') != 'text/javascript') { // external, non-javascript. Chrome, at least, will not load script elements with a type other than 'text/javascript'
                            if (old_script_element.hasAttribute('load-src')) { // user wants the load to happen
                                var src_url = old_script_element.getAttribute('load-src')
                                getHTML(src_url, function(request) {
                                    if (request.status==200) {
                                        old_script_element.innerHTML = request.responseText
                                        }
                                    else {
                                        console.log('could not load script - status: ', request.status )
                                        }
                                    forceNextScript()
                                    })
                                }
                            else {  // standard browser behaviour - no load
                                forceNextScript()
                                }
                            }
                        else { // external javascript - force it to load
                            forceScript(old_script_element).onload = forceNextScript
                            }
                        }
                    else { // internal script
                        forceScript(old_script_element)
                        forceNextScript()
                        }
                    }
                }
            forceNextScript()
            }
        element.innerHTML = inner_HTML // sadly, innerHTML refuses to load and execute scripts. We have to force them to load and execute
        forceAllScripts(element)
    }


    function onload(template_url) {
        ld_util.getHTML(template_url, function(request) {
            if (request.status == 200) {
                var app_html = request.responseText;
                ld_util.setInnerHTML(document.body, request.responseText);
                }
            else {
                console.log ('failed to load template: ' + template_url + ' status: ', request.status);
                }
            });
    };

    return {
        get:get,
        getRDF:get,
        getHTML:getHTML,
        getJSON:getJSON,
        send_transform:send_transform,
        send_create:send_create,
        send_patch:send_patch,
        send_delete:send_delete,
        send_put:send_put,
        setInnerHTML:setInnerHTML,
        onload:onload
    }
} ())
