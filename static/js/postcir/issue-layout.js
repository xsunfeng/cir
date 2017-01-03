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
        $('#issue-voter .ui.checkbox').checkbox({
            onChange: function () {
                var vote = this.getAttribute('data-vote');
                if (vote === 'yes' || vote === 'no') {
                    module.vote = vote;
                }
            }
        });
    }

    function makePost(rawcontent) {
        if (!module.vote) {
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
                $('#issue-vote-form').removeClass('loading');
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