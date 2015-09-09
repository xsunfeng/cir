define([
	'utils',
	'feed/activity-feed'
], function(
	Utils
) {
	var module = {};
	module.initDocumentView = function() {
		module.$category_element = $('#document-categories'); // static; initiate once
		module.$content_element = $('#document-pane'); // static; initiate once
		module.$annotation_element = $('#annotation-pane'); // static; initiate once

		// module.currentFolderId = -1;
		// module.currentDocId = -1;

		// highlighting
		module.currHighlights = {};
		module.newHighlight = {};
		module.isDragging = false;

		$('#doc-thread-content').feed('init');

		// element initialization
		$('.nopublish-wrapper').checkbox({
			onChecked: function() {
				$(this).parent().next().text('Save');
			},
			onUnchecked: function() {
				$(this).parent().next().text('Publish');
			}
		});

		// static listeners
		module.$content_element.click(function(e) {
			// remove all popovers
			$('#doc-thread-popup').removeAttr('style');
		});
		$('.doc-anno-btn').click(function(e) {
			module.newHighlight.type = this.getAttribute('data-action');
			if (module.newHighlight.type == 'comment') {
				$('#doc-claim-form').hide();
				$('#doc-comment-form').show().parent().show();
				$('#doc-comment-form textarea').focus();
				$('#doc-comment-form label span').text('Add a comment');
			} else if (module.newHighlight.type == 'question') {
				$('#doc-claim-form').hide();
				$('#doc-comment-form').show().parent().show();
				$('#doc-comment-form textarea').focus();
				$('#doc-comment-form label span').text('Raise a question');
			} else if (module.newHighlight.type == 'claim') {
				$('#doc-comment-form').hide();
				$('#doc-claim-form').show().parent().show();
				$('#doc-claim-form textarea').val($.trim(module.$content_element.find('.tk.highlighted').text())).focus();
			}
		});
		$('.doc-anno-submit').click(function(e) {
			var content = $(this).parents('form').find('textarea').val();
			if ($.trim(content).length == 0) {
				Utils.notify('error', 'Content must not be empty.');
				return;
			}
			$('#doc-highlight-toolbar .button').addClass('loading');
			var nopublish = false;
			if ($(this).parents('form').hasClass('claim')) {
				nopublish = $(this).parents('form').find('.nopublish-wrapper').checkbox('is checked');
			}
			$.ajax({
				url: '/api_highlight/',
				type: 'post',
				data: $.extend({
					action: 'create',
					content: content,
					nopublish: nopublish,
				}, module.newHighlight),
				success: function(xhr) {
					$('#doc-highlight-toolbar').removeAttr('style');
					$('#doc-highlight-toolbar textarea').val('');
					$('#doc-highlight-toolbar .button').removeClass('loading');
					$('.tk.highlighted').removeClass('highlighted')
					highlight({
						type: module.newHighlight.type,
						start: module.newHighlight.start,
						end: module.newHighlight.end,
						context_id: module.newHighlight.contextId,
						id: xhr.highlight_id
					});
				},
				error: function(xhr) {
					$('#doc-highlight-toolbar .button').removeClass('loading');
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});
		$('.doc-thread-btn').click(function(e) {
			var action = this.getAttribute('data-action');
			if (action == 'claim' && $('#doc-thread-content .event[data-type="claim"]').length) {
				Utils.notify('error', 'This highlight is already extracted as a claim');
				return;
			}
			$('#doc-thread-content').feed('switch', {
				'action': action
			});
			if (action == 'claim') {
				var highlight_id = $('#doc-thread-content').feed('get_id');
				$('#doc-thread-content .claim.form textarea').val(module.currHighlights[highlight_id].text).focus();
			}
		});

		// dynamic listeners
		module.$category_element.on('click', '.open-doc', function(e) {
			module.doc_id = this.getAttribute('data-id');
			updateDocument();
		});
		module.$content_element.on('click', '.jump-to-section', function(e) {
			var section_id = this.getAttribute('data-id');
			_jumpToSection(section_id);
		}).on('click', '.tk', function(e) {
			e.stopPropagation();
			if ($(this).hasClass('p') || $(this).hasClass('q') || $(this).hasClass('c')) {
				var highlight_ids = this.getAttribute('data-hl-id').split(' ');
				for (var i = 0; i < highlight_ids.length; i++) {
					$('#doc-thread-content').feed('update', {
						type: 'highlight',
						id: highlight_ids[i]
					}, function() {
						$('#doc-thread-popup').css('left', e.pageX).css('top', e.pageY);
					});
				}
			}
		}).on('mousedown', '.section-content', function(e) {
			alert("haha");
			if ($(e.target).is('u.tk')) {
				var $target = $(this);
				$(window).mousemove(function(e2) {
					if ($(e2.target).hasClass('tk')) {
						module.isDragging = true;
						module.newHighlight.end = e2.target.getAttribute('data-id');
						var min = Math.min(module.newHighlight.start, module.newHighlight.end);
						var max = Math.max(module.newHighlight.start, module.newHighlight.end);
						$target.find('.tk').removeClass('highlighted');
						for (var i = min; i <= max; i++) {
							$target.find('.tk[data-id="' + i + '"]').addClass('highlighted');
						}
						module.newHighlight.contextId = $target.attr('data-id');
					} else {
						$target.find('.tk').removeClass('highlighted');
					}
				});
				module.newHighlight.start = e.target.getAttribute('data-id');
				module.newHighlight.end = e.target.getAttribute('data-id');
			}
		}).on('mouseup', '.section-content', function(e) {
			$(window).off('mousemove');
			var wasDragging = module.isDragging;
			module.isDragging = false;
			if (wasDragging) {
				var min = Math.min(module.newHighlight.start, module.newHighlight.end);
				var max = Math.max(module.newHighlight.start, module.newHighlight.end);
				module.newHighlight.start = min;
				module.newHighlight.end = max;
				if ($(this).find('.tk.highlighted').length) {
					$('#doc-claim-form').hide();
					$('#doc-comment-form').parent().hide();
					$('#doc-highlight-toolbar').css('left', e.pageX).css('top', e.pageY);
				}
			} else { // just clicking
				$('#doc-highlight-toolbar').removeAttr('style');
				$(this).find('.tk').removeClass('highlighted');
			}
		});
	};
	module.updateCategories = function() {
		$.ajax({
			url: '/api_doc/',
			type: 'post',
			data: {
				'action': 'get-categories'
			},
			success: function(xhr) {
				module.$category_element.html(xhr.html);
				module.$category_element.find('.ui.accordion').accordion();
				module.$category_element.find('abbr').popup();
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	};
	function updateDocument() {
		$.ajax({
			url: '/api_doc/',
			type: 'post',
			data: {
				'action': 'get-document',
				'doc_id': module.doc_id
			},
			success: function(xhr) {
				// collapse document category accordion
				module.$category_element.find('.ui.accordion').accordion('close', 0);
				module.$content_element.html(xhr.html);
				module.$content_element.find('.ui.sticky').sticky({
					context: '#document-pane',
					offset: 70,
				});
				module.$content_element.find('abbr').popup();
				reloadHighlights();
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}
	function reloadHighlights() {
		$.ajax({
			url: '/api_highlight/',
			type: 'post',
			data: {
				action: 'load-doc',
				doc_id: module.doc_id,
			},
			success: function(xhr) {
				for (var i = 0; i < xhr.highlights.length; i++) {
					highlight(xhr.highlights[i]);
				}
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}

	function highlight(highlight) {
		var $context = module.$content_element.find('.section-content[data-id="' + highlight.context_id + '"]');
		var className;
		if (highlight.type == 'comment') {
			className = 'p'; // for 'post'
		} else if (highlight.type == 'question') {
			className = 'q'; // for 'question'
		} else if (highlight.type == 'claim') {
			className = 'c'; // for 'claim'
		}
		var text = [];
		for (var i = highlight.start; i <= highlight.end; i++) {
			var $token = $context.find('.tk[data-id="' + i + '"]');
			text.push($token.text());
			if (typeof $token.attr('data-hl-id') == 'undefined') { // new highlight for this word
				$token.addClass(className).attr('data-hl-id', highlight.id);
			} else {
				var curr_id = $token.attr('data-hl-id'); // append highlight for this word
				$token.addClass(className).attr('data-hl-id', curr_id + ' ' + highlight.id);
			}
		}
		module.currHighlights[highlight.id] = highlight;
		module.currHighlights[highlight.id].text = text.join('');
	}

	function _jumpToSection(section_id) {
		$('body').animate({
			scrollTop: module.$content_element.find('.section-header[data-id="' + section_id + '"]').offset().top - 50
		}, 100);
	}
	return module;
});
