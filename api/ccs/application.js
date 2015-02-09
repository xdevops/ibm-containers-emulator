var onload_function = function() {
    // step 0: setup global context
    var ace_config = document.getElementById('ace_config');
    var elem = document.getElementById('payload');
    var jso = JSON.parse(elem.textContent);
    jso._subject = elem.getAttribute('resource-url');

    window.$context = {
        ace_config: JSON.parse(ace_config.textContent),
        resource_type: elem.getAttribute('resource-type'),
        jso: jso,
        auth_token: elem.getAttribute('auth-token')
    };

    // step 1: dynamically load spa template
    var head  = document.getElementsByTagName('head')[0];
    var util_script = document.createElement('script');
    util_script.type= 'text/javascript';
    util_script.src = '/ccs/utils.js';

    util_script.onload = function() {
        ld_util.onload('/ccs/spa.html');
    };
    head.appendChild(util_script);
};

window.addEventListener('DOMContentLoaded', onload_function, false);