function CirDocument() {
	var _this = this;
	this.$category_element = $('#document-categories'); // static; initiate once
	this.$content_element = $('#document-pane'); // static; initiate once
	this.$annotation_element = $('#annotation-pane'); // static; initiate once

	this.$new_comment_form = $('#doc-comment-form');
	this.$new_claim_form = $('#doc-claim-form');
	// this.currentFolderId = -1;
	// this.currentDocId = -1;

	// highlighting
	this.currHighlight = {};
	this.isDragging = false;

	$('#nopublish-wrapper').checkbox({
		onChecked: function() {
			$(this).parent().next().text('Save');
		},
		onUnchecked: function() {
			$(this).parent().next().text('Publish');
		}
	});

	// static listeners
	$('.doc-anno-btn').click(function(e) {
		_this.currHighlight.type = this.getAttribute('data-action');
		if (_this.currHighlight.type == 'comment') {
			_this.$new_claim_form.hide();
			_this.$new_comment_form.show().parent().show();
			_this.$new_comment_form.find('label').text('Add a comment');
		} else if (_this.currHighlight.type == 'question') {
			_this.$new_claim_form.hide();
			_this.$new_comment_form.show().parent().show();
			_this.$new_comment_form.find('label').text('Raise a question');
		} else if (_this.currHighlight.type == 'claim') {
			_this.$new_comment_form.hide();
			_this.$new_claim_form.show().parent().show();
			_this.$new_claim_form.find('label.content-type').text('Extract a claim');
			_this.$new_claim_form.find('textarea').val($.trim(_this.$content_element.find('.tk.highlighted').text()));
		}
	});
	$('.doc-anno-submit').click(function(e) {
		var content = $(this).parents('form').find('textarea').val();
		if ($.trim(content).length == 0) {
			notify('error', 'Content cannot be empty.');
			return;
		}
		$('#doc-highlight-toolbar .button').addClass('loading');
		$.ajax({
			url: '/api_highlight/',
			type: 'post',
			data: $.extend({
				action: 'create',
				content: content,
				nopublish: $('#nopublish-wrapper').checkbox('is checked'),
			}, _this.currHighlight),
			success: function(xhr) {
				$('#doc-highlight-toolbar').removeAttr('style');
				$('#doc-highlight-toolbar textarea').val('');
				$('#doc-highlight-toolbar .button').removeClass('loading');
				$('.tk.highlighted').removeClass('highlighted')
				_this.highlight({
					type: _this.currHighlight.type,
					start: _this.currHighlight.start,
					end: _this.currHighlight.end,
					context_id: _this.currHighlight.contextId,
					id: xhr.highlight_id
				});
			},
			error: function(xhr) {
				$('#doc-highlight-toolbar .button').removeClass('loading');
				if (xhr.status == 403) {
					notify('error', xhr.responseText);
				}
			}
		});
	});

	// dynamic listeners
	this.$category_element.on('click', '.open-doc', function(e) {
		_this.doc_id = this.getAttribute('data-id');
		_this.updateDocument();
	});
	this.$content_element.on('click', '.jump-to-section', function(e) {
		var section_id = this.getAttribute('data-id');
		_this._jumpToSection(section_id);
	});
	this.$content_element.on('click', '.tk', function(e) {
		if ($(this).hasClass('p') || $(this).hasClass('q') || $(this).hasClass('c')) {
			var highlight_ids = this.getAttribute('data-hl-id').split(' ');
			for (var i = 0; i < highlight_ids.length; i++) {
				_this.loadThread(highlight_ids[i], e);
			}
		}
	});
	this.$content_element.on('mousedown', '.section-content', function(e) {
		if ($(e.target).is('u.tk')) {
			var $target = $(this);
			$(window).mousemove(function(e2) {
				if ($(e2.target).hasClass('tk')) {
					_this.isDragging = true;
					_this.currHighlight.end = e2.target.getAttribute('data-id');
					var min = Math.min(_this.currHighlight.start, _this.currHighlight.end);
					var max = Math.max(_this.currHighlight.start, _this.currHighlight.end);
					$target.find('.tk').removeClass('highlighted');
					for (var i = min; i <= max; i ++) {
						$target.find('.tk[data-id="' + i + '"]').addClass('highlighted');
					}
					_this.currHighlight.contextId = $target.attr('data-id');
				} else {
					$target.find('.tk').removeClass('highlighted');
				}
			});
			_this.currHighlight.start = e.target.getAttribute('data-id');
			_this.currHighlight.end = e.target.getAttribute('data-id');
		}
	});

	this.$content_element.on('mouseup', '.section-content', function(e) {
		$(window).off('mousemove');
		var wasDragging = _this.isDragging;
		_this.isDragging = false;
		if (wasDragging) {
			var min = Math.min(_this.currHighlight.start, _this.currHighlight.end);
			var max = Math.max(_this.currHighlight.start, _this.currHighlight.end);
			_this.currHighlight.start = min;
			_this.currHighlight.end = max;
			if ($(this).find('.tk.highlighted').length) {
				_this.$new_claim_form.hide();
				_this.$new_comment_form.hide().parent().hide();
				$('#doc-highlight-toolbar').css('left', e.pageX).css('top', e.pageY);
			}
		} else { // just clicking
			$('#doc-highlight-toolbar').removeAttr('style');
			$(this).find('.tk').removeClass('highlighted');
		}
	});

	this.updateCategories = function() {
		$.ajax({
			url: '/api_doc/',
			type: 'post',
			data: {
				'action': 'get-categories'
			},
			success: function(xhr) {
				_this.$category_element.html(xhr.html);
				_this.$category_element.find('.ui.accordion').accordion();
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					notify('error', xhr.responseText);
				}
			}
		});
	};
	this.updateDocument = function() {
		$.ajax({
			url: '/api_doc/',
			type: 'post',
			data: {
				'action': 'get-document',
				'doc_id': _this.doc_id
			},
			success: function(xhr) {
				_this.$content_element.html(xhr.html);
				_this.$content_element.find('.ui.sticky').sticky({
					context: '#document-pane',
					offset: 70,
				});
				_this.reloadHighlights();
				// collapse document category accordion
				_this.$category_element.find('.ui.accordion').accordion('close', 0);
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					notify('error', xhr.responseText);
				}
			}
		});
	};
	this.reloadHighlights = function() {
		$.ajax({
			url: '/api_highlight/',
			type: 'post',
			data: {
				action: 'load-doc',
				doc_id: _this.doc_id,
			},
			success: function(xhr) {
				for (var i = 0; i < xhr.highlights.length; i++) {
					_this.highlight(xhr.highlights[i]);
				}
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					notify('error', xhr.responseText);
				}
			}
		});
	};
	this.loadThread = function(highlight_id, e) {
		$.ajax({
			url: '/api_annotation/',
			type: 'post',
			data: {
				action: 'load-thread',
				highlight_id: highlight_id
			},
			success: function(xhr) {
				$('#doc-thread-popup').html(xhr.html);
				$('#doc-thread-popup').css('left', e.pageX).css('top', e.pageY);
			},
			error: function(xhr) {

			}
		});
	};
	this.highlight = function(highlight) {
		var $context = _this.$content_element.find('.section-content[data-id="' + highlight.context_id + '"]');
		var className;
		if (highlight.type == 'comment') {
			className = 'p'; // for 'post'
		} else if (highlight.type == 'question') {
			className = 'q'; // for 'question'
		} else if (highlight.type == 'claim') {
			className = 'c'; // for 'claim'
		}
		for (var i = highlight.start; i <= highlight.end; i++) {
			var $token = $context.find('.tk[data-id="' + i + '"]');
			if (typeof $token.attr('data-hl-id') == 'undefined') {
				$token.addClass(className).attr('data-hl-id', highlight.id);
			} else {
				var curr_id = $token.attr('data-hl-id');
				$token.addClass(className).attr('data-hl-id', curr_id + ' ' + highlight.id);
			}
		}
	};
	this._jumpToSection = function(section_id) {
		$('body').animate({
			scrollTop: _this.$content_element.find('.section-header[data-id="' + section_id + '"]').offset().top - 50
		}, 100);
	};
	return this;
}
