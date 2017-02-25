define([
    'jquery',
    'utils',
    'tinymce',
    'semantic-ui'

], function ($,
             Utils
) {
    var urlPrefix = '/postcir';
    var module = {};
    initLayout();

    function initLayout() {
        if ($('body').attr('data-flavour') == 'mobile') {
            $('#issue-vote-btn').click(function () {
                var rawcontent = $('#issue-vote-textarea').val();
                makePost(rawcontent);
            });
        } else {
            tinymce.init({
                selector: '#issue-vote-textarea',
                max_height: 600,
                autoresize_max_height: 400,
                autoresize_bottom_margin: 0,
                menubar: false,
                min_height: 100,
                plugins: 'autoresize paste autolink link image noneditable',
                browser_spellcheck: true,
                statusbar: false,
                paste_as_text: true,
                toolbar: 'undo redo | bold italic | bullist numlist | link image',
                content_css: '/static/css/postcir_editor.css',
                forced_root_block: '',
            });
            $('#issue-vote-btn').click(function () {
                var body = tinymce.activeEditor.getBody();
                var rawcontent = tinymce.activeEditor.getContent();
                makePost(rawcontent);
            });
        }

        // initialize voter
        module.vote = 0;
        $('#issue-voter input[type="range"]').on('change', function() {
            module.vote = this.value;
        });
    }

    function makePost(rawcontent) {
        if (!module.hasOwnProperty('vote')) {
            return;
        }
        $('#issue-vote-form').addClass('loading');
        var data = {
            'content': rawcontent,
            'action': 'complete-issue',
            'vote': module.vote,
            'context': 'issue'
        };
        $.ajax({
            url: urlPrefix + '/api_postcir/',
            type: 'post',
            data: data,
            success: function (xhr) {
                window.scrollTo(0, 0);
                window.location.reload();
            },
            error: function (xhr) {
                if (xhr.status == 403) {
                    Utils.notify('error', xhr.responseText);
                }
                $('#issue-vote-form').removeClass('loading');
            }
        });
    }
});