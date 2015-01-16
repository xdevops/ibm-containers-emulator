var onload_function = function() {
    // step 0: setup global context
    var elem = document.getElementById('payload');
    window.$context = {
        resource_type: elem.getAttribute('resource'),
        jso: JSON.parse(elem.innerText)
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