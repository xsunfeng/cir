define([
	'utils',
	'feed/activity-feed'
], function(
	Utils
) {
	var module = {};
	module.highlightsFilter = {
		showtype: 'none',
	};
	module.initDocumentView = function() {
		module.$category_element = $('#document-categories'); // static; initiate once
		module.$content_element = $('#document-pane'); // static; initiate once

		// highlighting
		module.highlightText = {};
		module.newHighlight = {};
		module.highlightsData = [];
		module.isDragging = false;

		$('#doc-thread-content').feed('init');

		// static listeners
		module.$content_element.click(function(e) {
			// remove all popovers
			$('#doc-thread-popup').removeAttr('style');
		});
		initPopup();
		initForms();
		initTagControl();
		// dynamic listeners
		module.$category_element.on('click', '.open-doc', function(e) {
			module.doc_id = this.getAttribute('data-id');
			module.updateDocument()
				.done(module.reloadHighlights());
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
					}).done(function() {
						$('#doc-thread-popup').css('left', e.pageX).css('top', e.pageY);
					});
				}
			} else if ($(this).hasClass('t')) {
				var highlight_ids = this.getAttribute('data-hl-id').split(' ');
				var contents = [];
				for (var i = 0; i < module.highlightsData.length; i++) {
					if (highlight_ids.indexOf(String(module.highlightsData[i].id)) > -1) {
						contents.push(module.highlightsData[i].content);
					}
				}
				$(this).popup({
					content: 'Tags: ' + contents.join('; ')
				});
			}
		}).on('mousedown', '.section-content', function(e) {
			$('#doc-highlight-toolbar').removeAttr('style');
			$('#doc-thread-popup').removeAttr('style');
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
					var highlights = $(this).find('.tk.highlighted');
					var text = "";
					for (var i = 0; i < highlights.length; i ++) {
						text += highlights[i].textContent;
					};
					module.newHighlight.text = text;
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
	function initPopup() {
		// popup toolbar
		$('.doc-anno-btn').click(function(e) {
			module.newHighlight.type = this.getAttribute('data-action');
			if (module.newHighlight.type == 'comment') {
				$('#doc-claim-form').hide();
				$('#doc-tag-form').hide();
				$('#doc-comment-form').show().parent().show();
				$('#doc-comment-form textarea').focus();
				$('#doc-comment-form label span').text('Add a comment');
			} else if (module.newHighlight.type == 'question') {
				$('#doc-claim-form').hide();
				$('#doc-tag-form').hide();
				$('#doc-comment-form').show().parent().show();
				$('#doc-comment-form textarea').focus();
				$('#doc-comment-form label span').text('Raise a question');
			} else if (module.newHighlight.type == 'claim') {
				$('#doc-comment-form').hide();
				$('#doc-tag-form').hide();
				$('#doc-claim-form').show().parent().show();
				$('#doc-claim-form textarea').val($.trim(module.$content_element.find('.tk.highlighted').text())).focus();
			} else if (module.newHighlight.type == 'tag') {
				$('#doc-claim-form').hide();
				$('#doc-comment-form').hide();
				$('#doc-tag-form').show().parent().show();
			}
		});
		// submitting posts & comments
		$('.doc-anno-submit').click(function(e) {
			var content = $(this).parents('form').find('textarea').val();
			if ($.trim(content).length == 0) {
				notify('error', 'Content must not be empty.');
				return;
			}
			$('#doc-highlight-toolbar .button').addClass('loading');
			$.ajax({
				url: '/api_highlight/',
				type: 'post',
				data: $.extend({
					action: 'create',
					content: content,
				}, module.newHighlight),
				success: function(xhr) {
					afterAddHighlight(xhr.highlight_id);
					// if it's a new question, dispatch.
					if (module.newHighlight.type == 'question') {
						var message = '<b>' + sessionStorage.getItem('user_name')
							+ '</b> ('
							+ sessionStorage.getItem('role')
							+ ') just asked a new question.';
						require('realtime/socket').dispatchNewQuestion({
							message: message
						});
					}
				},
				error: function(xhr) {
					$('#doc-highlight-toolbar .button').removeClass('loading');
					if (xhr.status == 403) {
						notify('error', xhr.responseText);
					}
				}
			});
		});
		// actions on highlights
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
				$('#doc-thread-content .claim.form textarea').val(module.highlightText[highlight_id]).focus();
			}
		});
	}
	function clearHighlights() {
		$('#document-pane [data-hl-id]')
			.removeClass('t')
			.removeClass('c')
			.removeClass('p')
			.removeClass('q')
			.removeAttr('data-hl-id');
	}
	function afterAddHighlight(newHighlightId) {
		// reset input boxes
		$('#doc-claim-form').form('reset');
		doc-highlight-toolbar
		$('#doc-highlight-toolbar textarea').val('');
		$('#doc-highlight-toolbar .button').removeClass('loading');
		$('.tk.highlighted').removeClass('highlighted');

		var newHighlightData = {
			author_id: sessionStorage.getItem('user_id'),
			context_id: module.newHighlight.contextId,
			start: module.newHighlight.start,
			end: module.newHighlight.end,
			id: newHighlightId,
			text: module.newHighlight.text,
			type: module.newHighlight.type
		};

		// dispatch to other users
		require('realtime/socket').dispatchNewHighlight(newHighlightData);

		// update current highlights dataset
		module.highlightsData.push(newHighlightData);

		// update question panel
		require('doc/qa').updateQuestionList();

		// switch to highlight type and update
		module.updateHighlightFilter({
			switch: module.newHighlight.type
		});
	}
	module.receiveNewHighlight = function(newHighlight) {
		module.highlightsData.push(newHighlight);
		if (newHighlight.type == module.highlightsFilter.showtype) {
			// add the highlight to screen, only if the user is looking at this highlight type
			highlight(newHighlight);
		}
	};
	function afterAddTag(newTagsData) {
		$('#doc-tag-form .tag.dropdown').dropdown('clear');
		$('#doc-highlight-toolbar').removeAttr('style');
		$('.tk.highlighted').removeClass('highlighted');
		// avoid calling checkbox's callback (because that would call reloadHighlights again
		$('#highlight-filter-pane .showtype.fields .radio.checkbox').checkbox('set unchecked');
		$('#highlight-filter-pane input[val="annotation"]').parent().checkbox('set checked');
		module.highlightsFilter.showtype = 'annotation';
		$('#available-tags').show();
		module.reloadHighlights()
			.done(function() {
				for (var i = 0; i < newTagsData.length; i++) {
					var newTag = newTagsData[i];
					$('#available-tags .toggle.button').each(function() {
						if ($(this).text() == newTag.content) {
							$(this).trigger('click');
						}
					});
				}
			});
	}
	function initTagControl() {
		$('#available-tags').on('click', '.toggle.button', function() {
			$(this).toggleClass('active');
			module.updateHighlightFilter();
		});
	}
	function initForms() {
		// element initialization
		$('#doc-claim-form .ui.checkbox').checkbox({
			onChecked: function() {
				$(this).parent().parent().next().text('Save');
			},
			onUnchecked: function() {
				$(this).parent().parent().next().text('Publish');
			}
		});
		$('#doc-claim-form').form({
			fields: {
				content: {
					identifier: 'content',
					rules: [{
						type: 'empty',
						prompt: 'Content must not be empty.'
					}]
				}
			},
			onSuccess: function(e) {
				e.preventDefault();
				$('#doc-highlight-toolbar .button').addClass('loading');
				$.ajax({
					url: '/api_highlight/',
					type: 'post',
					data: $.extend({
						action: 'create',
						theme_id: $(this).find("select").val(),
					}, module.newHighlight, $('#doc-claim-form').form('get values')),
					success: function(xhr) {
						afterAddHighlight(xhr.highlight_id);
					},
					error: function(xhr) {
						$('#doc-highlight-toolbar .button').removeClass('loading');
						if (xhr.status == 403) {
							Utils.notify('error', xhr.responseText);
						}
					}
				});
			}
		});
		$('#doc-comment-form textarea').keydown(function(e) {
			if ((e.ctrlKey || e.metaKey) && e.keyCode == 13) {
				$('#doc-comment-form .doc-anno-submit').trigger('click');
			}
		});
		$('#highlight-filter-pane .showtype.fields .checkbox').checkbox({
			onChecked: function() {
				var showtype = this.getAttribute('val');
				module.highlightsFilter.showtype = showtype;
				module.updateHighlightFilter();
				if (showtype == 'annotation') {
					$('#available-tags').show();
				} else {
					$('#available-tags').hide();
				}
			}
		});
		$('#doc-tag-form .tag.dropdown').dropdown({
			allowAdditions: true,
		});
		$('#doc-tag-form').on('click', '.primary.button', function() {
			var tags = $('#doc-tag-form .tag.dropdown').dropdown('get values');
			if (tags == null) {
				notify('error', 'No tag created; please append a comma to make one.');
				return;
			}
			$.ajax({
				url: '/api_tag/',
				type: 'post',
				data: $.extend({
					'action': 'add-tags',
					'tags': JSON.stringify(tags)
				}, module.newHighlight),
				success: function(xhr) {
					afterAddTag(xhr.new_tags);
				},
			});
		});
	}

	module.updateDocument = function() {
		return $.ajax({
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
				$("#back-to-top-btn").click(function(){
					$("body").scrollTop(0);
				});
				$('#highlight-filter-pane').show();
				$('#tag-filter-pane').show();
				$('#highlight-filter-pane .none.checkbox').checkbox('check');
				module.$content_element.find('abbr').popup();
				$('.ui.dropdown').dropdown();
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	};

	module.updateHighlightFilter = function(options) {
		var options = options || {};
		clearHighlights();

		// switch to this showtype first
		if (options.switch) {
			$('#highlight-filter-pane .showtype.fields .radio.checkbox').checkbox('uncheck');
			$('#highlight-filter-pane input[val="' + options.switch + '"]').parent().checkbox('check');
		}

		if (module.highlightsFilter.showtype == 'none') return;

		var items = [];
		if (module.highlightsFilter.showtype == 'annotation') {
			var activeTags = [];
			$('#available-tags .toggle.button.active').each(function() {
				activeTags.push($(this).text());
			});
			items = $.grep(module.highlightsData, function(item) {
				return item.type == 'tag'
					&& activeTags.indexOf(item.content) > -1;
			});
		} else {
			items = $.grep(module.highlightsData, function(item) {
				return item.type == module.highlightsFilter.showtype;
			});
		}
		for (var i = 0; i < items.length; i++) {
			highlight(items[i]);
		}
	};
	module.reloadHighlights = function() {
		return $.ajax({
			url: '/api_highlight/',
			type: 'post',
			data: {
				action: 'load-doc',
				doc_id: module.doc_id
			},
			success: function(xhr) {
				module.highlightsData = xhr.highlights;
				$('#available-tags').html(xhr.html);
				var html = '<option value="">Separate tags with comma</option>';
				var allTags = [];
				for (var i = 0; i < module.highlightsData.length; i++) {
					var item = module.highlightsData[i];
					if (item.type == 'tag' && allTags.indexOf(item.content) == -1) {
						allTags.push(item.content);
						html += '<option value="' + item.content + '">' + item.content + '</option>';
					}
				}
				$('#doc-tag-form .tag.dropdown select[multiple]').html(html);
				module.updateHighlightFilter();
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	};

	module.jumpToHighlight = function(highlight_id) {
		var $target = $('u.tk[data-hl-id*="' + highlight_id + '"]');
		if ($target.length > 0) {
			var elOffset = $target.offset().top;
			var windowHeight = $(window).height();
			$(window).scrollTop(elOffset - (windowHeight / 2));
			$target.addClass('highlight-found');
			setTimeout(function() {
				$target.removeClass('highlight-found');
			}, 2000);
		}
	};

	/**
	 * Required fields:
	 *
	 * highlight = {
	 * 	id:
	 * 	type:
	 * 	context_id:
	 * 	start:
	 * 	end:
	 * }
	 * @param highlight
	 */
	function highlight(highlight) {
		// get context document section
		var $context = module.$content_element.find('.section-content[data-id="' + highlight.context_id + '"]');
		var className;
		if (highlight.type == 'comment') {
			className = 'p'; // for 'post'
		} else if (highlight.type == 'question') {
			className = 'q'; // for 'question'
		} else if (highlight.type == 'claim') {
			className = 'c'; // for 'claim'
		} else if (highlight.type == 'tag') {
			className = 't'; // for 'tag
		}
		var text = [];
		// loop over all words in the highlight
		for (var i = highlight.start; i <= highlight.end; i++) {
			var $token = $context.find('.tk[data-id="' + i + '"]');
			text.push($token.text());
			// (1) add class name
			// (2) update data-hl-id
			if (typeof $token.attr('data-hl-id') == 'undefined') { // new highlight for this word
				$token.addClass(className).attr('data-hl-id', highlight.id);
			} else {
				var curr_id = $token.attr('data-hl-id'); // append highlight for this word
				$token.addClass(className).attr('data-hl-id', curr_id + ' ' + highlight.id);
			}
		}
		module.highlightText[highlight.id] = text.join('');
	}

	function _jumpToSection(section_id) {
		$('body').animate({
			scrollTop: module.$content_element.find('.section-header[data-id="' + section_id + '"]').offset().top - 50
		}, 100);
	}
	return module;
});
