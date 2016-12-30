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
        $('#posts-area').on('click', '.feed-reply-post', function (e) {
            e.preventDefault();
            var reply_name = $(this).parents('.event').find('.user:eq(0)').text();
            module.reply_id = this.getAttribute('data-id');
            $('#activity-reply-form label').text('Reply to ' + reply_name);
            $('#activity-reply-form').insertAfter($(this).parent()).show();
            $('#activity-reply-form textarea').focus();
        });
        $('#reply-btn').click(function(e) {
            e.preventDefault();
            var data = {
                'content': $('#activity-reply-form textarea').val(),
                'action': 'new-post',
                'parent_id': module.reply_id
            };
            $.ajax({
                url: urlPrefix + '/api_postcir/',
                type: 'post',
                data: data,
                success: function (xhr) {
                    $('#posts-area').html(xhr.html);
                },
                error: function (xhr) {
                    if (xhr.status == 403) {
                        Utils.notify('error', xhr.responseText);
                    }
                }
            });
        });




    }

    return module;
});