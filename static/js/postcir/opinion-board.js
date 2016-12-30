define([
    'jquery',
    'utils',
    'postcir/statement-region',
    'tinymce'

], function (
    $,
    StatementRegion,
    Utils
) {
    var urlPrefix = '/postcir';
    var module = {};
    initLayout();

    function initLayout() {
        tinymce.init({
            selector: '#opinion-textarea',
            max_height: 600,
            autoresize_max_height: 400,
            autoresize_bottom_margin: 0,
            menubar: false,
            min_height: 100,
            plugins: 'autoresize paste autolink link image noneditable',
            noneditable_noneditable_class: 'cite-label',
            browser_spellcheck: true,
            statusbar: false,
            paste_as_text: true,
            toolbar: 'undo redo | bold italic | bullist numlist | link image',
            content_css: '/static/css/postcir_editor.css',
            forced_root_block: '',
            setup: function (editor) {
                editor.on('click', StatementRegion.handleClickCitationLabel);
            }
        });
        $('#post-btn').click(function () {
            var body = tinymce.activeEditor.getBody();
            var $citations = $(body).find('.cite-label');
            var rawcontent = tinymce.activeEditor.getContent();
            makePost(rawcontent, $citations);
        });
        $('#voter .ui.checkbox').checkbox({
            onChange: function() {
                var vote = this.getAttribute('data-vote');
                if (vote === 'yes' || vote === 'no') {
                    module.vote = vote;
                    $('#voter-prompt').text('Please share the reason of your vote.');
                    $('#post-btn').text('Vote');
                }
            }
        });
    }

    function makePost(rawcontent, $citations) {
        var citations = [];
        for (var i = 0; i < $citations.length; i++) {
            citations.push({
                'stmt_item_id': $citations.get(i).getAttribute('data-stmt-item-id'),
                'start': $citations.get(i).getAttribute('data-start'),
                'end': $citations.get(i).getAttribute('data-end'),
            });
        }
        var data = {
            'content': rawcontent,
            'action': 'new-post',
            'citations': JSON.stringify(citations),
            'vote': module.vote
        };
        $.ajax({
            url: urlPrefix + '/api_postcir/',
            type: 'post',
            data: data,
            success: function (xhr) {
                $('#posts-area').html(xhr.html);
                tinymce.activeEditor.setContent('');
            },
            error: function (xhr) {
                if (xhr.status == 403) {
                    Utils.notify('error', xhr.responseText);
                }
            }
        });
    }
});