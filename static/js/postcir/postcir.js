define([
	'jquery',
	'utils',
    'tinymce',
	'semantic-ui',

], function(
	$,
	Utils
) {
    var module = {};
	var urlPrefix = '/postcir';

	function initLayout() {

		$('.ui.accordion').accordion();
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
			forced_root_block : '',
            setup: function(editor) {

            }
        });

        module.newHighlight = {};
        module.isDragging = false;
        module.draggingTarget = null;

        $('#stmt').on('click', '.tk', function (e) {
            e.stopPropagation();
            if ($(this).hasClass('r')) {
                var highlight_ids = this.getAttribute('data-hl-id').split(' ');
                for (var i = 0; i < highlight_ids.length; i++) {
                    // this highlighted text is referenced -- don't do anything TODO
                }
            }
        }).on('mousedown', '.stmt-item', function (e) {
            $('#stmt-highlight-toolbar').removeAttr('style');
            if ($(e.target).is('u.tk')) {
                module.draggingTarget = $(e.target.parentElement);
                module.draggingTarget.mousemove(function(e2) {
                    module.isDragging = true;
                    module.newHighlight.end = e2.target.getAttribute('data-id');
                    var min = Math.min(module.newHighlight.start, module.newHighlight.end);
                    var max = Math.max(module.newHighlight.start, module.newHighlight.end);
                    $('.tk.highlighted').removeClass('highlighted').removeClass('my');
                    for (var i = min; i <= max; i++) {
                        module.draggingTarget.find('.tk[data-id="' + i + '"]').addClass('highlighted');
                    }
                    module.newHighlight.contextId = module.draggingTarget.attr('data-id');
                });
                module.newHighlight.start = e.target.getAttribute('data-id');
            }
        }).on('mouseup', '.stmt-item', function (e) {
            module.draggingTarget.off('mousemove');
            var wasDragging = module.isDragging;
            module.isDragging = false;
            if (wasDragging) {
                var min = Math.min(module.newHighlight.start, module.newHighlight.end);
                var max = Math.max(module.newHighlight.start, module.newHighlight.end);
                module.newHighlight.start = min;
                module.newHighlight.end = max;


                if ($(this).find('.tk.highlighted').length) {
                    var highlights = $(this).find('.tk.highlighted');
                    var text = "";
                    for (var i = 0; i < highlights.length; i++) {
                        text += highlights[i].textContent;
                    }
                    module.newHighlight.text = text;
                    module.newHighlight.cite_name = $(highlights[0]).parents('li').attr('data-cite-name');
                    $('#stmt-highlight-toolbar').css('left', e.pageX - 14).css('top', e.pageY + $('#stmt').scrollTop() - 50);
                }
            } else { // just clicking
                $('#stmt-highlight-toolbar').removeAttr('style');
                $(this).find('.tk').removeClass('highlighted').removeClass('my');
                module.newHighlight = {};
            }
        });

        $('#stmt-highlight-toolbar .stmt-cite-btn').click(function() {
            var citeHtml = '<span class="cite-label" data-stmt-item-id="'
                + module.newHighlight.contextId
                + '" data-start="'
                + module.newHighlight.start
                + '" data-end="'
                + module.newHighlight.end
                + '">'
                + module.newHighlight.cite_name
                + '</span>';
            tinymce.activeEditor.insertContent(citeHtml);
            $('#stmt-highlight-toolbar').removeAttr('style');
            $('#stmt .tk.highlighted').removeClass('highlighted');
            highlight({
                context_id: module.newHighlight.contextId,
                start: module.newHighlight.start,
                end: module.newHighlight.end,
                type: 'my_citation',
                highlight_id: null
            });
            module.newHighlight = {};
        });

        $('#post-btn').click(function() {
			var body = tinymce.activeEditor.getBody();
			var $citations = $(body).find('.cite-label');
			var rawcontent = tinymce.activeEditor.getContent();
            makePost(rawcontent, $citations);
        });
	}

	initLayout();
	loadPosts();

	function makePost(rawcontent, $citations) {
	    var citations = [];
		for (var i = 0; i < $citations.length; i ++) {
			citations.push({
				'stmt_item_id': $citations.get(i).getAttribute('data-stmt-item-id'),
				'start': $citations.get(i).getAttribute('data-start'),
				'end': $citations.get(i).getAttribute('data-end'),
			});
		}
        var data = {
			'content': rawcontent,
			'action': 'new-post',
            'citations': JSON.stringify(citations)
		};
		$.ajax({
			url: urlPrefix + '/api_postcir/',
			type: 'post',
			data: data,
			success: function(xhr) {
				$('#posts-area').html(xhr.html);
				tinymce.activeEditor.setContent('');
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}
	function loadPosts() {
		$('#posts-area').html('<div class="ui active centered inline loader"></div>');
		$.ajax({
			url: urlPrefix + '/api_postcir/',
			type: 'post',
			data: {
				action: 'load-posts'
			},
			success: function(xhr) {
				$('#posts-area').html(xhr.html);
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			},
		});
	}

    function highlight(data) {
        var $context = $('#stmt .stmt-item[data-id="' + data.context_id + '"]');
        var className;
        if (data.type == 'my_citation') {
            className = 'my';
        } else if (data.type == 'others_citation') {
            className = 'others';
        }
        var text = [];
        // loop over all words in the highlight
        for (var i = parseInt(data.start); i <= parseInt(data.end); i++) {
            var $token = $context.find('.tk[data-id="' + i + '"]');
            $token.addClass(className);
            if (data.highlight_id) {
                if (typeof $token.attr('data-hl-id') == 'undefined') { // new highlight for this word
                    $token.attr('data-hl-id', data.highlight_id);
                } else {
                    var curr_id = $token.attr('data-hl-id'); // append highlight for this word
                    $token.attr('data-hl-id', curr_id + ' ' + data.highlight_id);
                }
            }
        }
    }
    return module;
});

