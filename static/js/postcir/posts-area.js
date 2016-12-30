define([
	'jquery',
	'utils',
    'postcir/statement-region',
], function(
	$,
	Utils,
    StatementRegion
) {
    var urlPrefix = '/postcir';
    var module = {
        loadPosts: function() {
            $('#posts-area').html('<div class="ui active centered inline loader"></div>');
            $.ajax({
                url: urlPrefix + '/api_postcir/',
                type: 'post',
                data: {
                    action: 'load-posts'
                },
                success: function (xhr) {
                    $('#posts-area').html(xhr.html);
                },
                error: function (xhr) {
                    if (xhr.status == 403) {
                        Utils.notify('error', xhr.responseText);
                    }
                },
            });
        }
    };

    initUI();
    module.loadPosts();

    function initUI() {
        $('#posts-area').click(function (e) {
            $('#stmt .tk').removeClass('highlighted').removeClass('my');
            if ($(e.target).hasClass('cite-label')) {
                StatementRegion.handleClickCitationLabel(e);
            }
        });
    }

    return module;
});