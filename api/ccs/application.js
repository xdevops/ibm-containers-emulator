var onload_function = function() {
    // step 0: setup global context
    var elem = document.getElementById('payload');
    var jso = JSON.parse(elem.innerText);
    jso._subject = elem.getAttribute('resource-url');

    window.$context = {
        resource_type: elem.getAttribute('resource-type'),
        jso: jso
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