require.config({
    baseUrl: "/static/js",
    paths: {
        'jquery': '//ajax.googleapis.com/ajax/libs/jquery/1.11.2/jquery.min',
        'semantic-ui': '//cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.2.2/semantic.min',
        'socket.io': '//130.203.136.141:443/socket.io/socket.io',
        'tinymce': '//cdn.tinymce.com/4/tinymce.min',
    },
    shim: {
        'semantic-ui': ['jquery'],
    },
    waitSeconds: 200,
});
require([
    'jquery',
    'layout/header',
], function (
    $,
    Header
) {
    Header.initHeader();
    var phase = $('body').attr('data-phase');
    if (phase == 'issue') {
        require(['postcir/issue-layout']);
    }
    if (phase == 'statement') {
        require(['postcir/statement-layout']);
    }
    if (phase == 'deliberation') {
        require(['postcir/postcir-layout']);
    }
});