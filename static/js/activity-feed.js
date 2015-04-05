jQuery.fn.feed = function(action, data, update_callback) {
	var _this = this;

	this.update = function() {
		if (this.data('type') == 'highlight') { // load activity feed on a highlight
			this.data('highlight_id', this.data('id'));
			var url = '/api_annotation/';
		} else if (this.data('type') == 'claim') {
			this.data('claim_id', this.data('id'));
			var url = '/api_claim_activities/';
		}
		$.ajax({
			url: url,
			type: 'post',
			data: $.extend({
				action: 'load-thread'
			}, _this.data()),
			success: function(xhr) {
				_this.html(xhr.html);
				var $events = _this.find('.event');
				_this.find('abbr').popup();
				$events.each(function(ind, el) {
					if ($(el).find('.user').attr('data-id') == sessionStorage.user_id) {
						$(el).find('.feed-delete-entry').show();
					}
				});
				_this.find('.nopublish-wrapper').checkbox({
					onChecked: function() {
						$(this).parent().next().text('Save');
					},
					onUnchecked: function() {
						$(this).parent().next().text('Publish');
					}
				});
				if (typeof update_callback == 'function') {
					update_callback();
				}
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					notify('error', xhr.responseText);
				}
			},
		});
	}

	if (action == 'init') {
		// listeners
		this.on('click', '.feed-reply-entry', function(e) {
			var name = $(this).parents('.event').find('.user').text();
			var entry_id = this.getAttribute('data-id');
			_this.find('.feed-forms .claim.form').hide();
			_this.find('.feed-forms .comment.form span').attr('data-reply-id', entry_id).text('Reply to ' + name);
			_this.find('.feed-forms .comment.form').show();
			_this.find('.feed-forms').show();
			_this.find('.feed-forms .comment.form textarea').focus();
		}).on('click', '.feed-delete-entry', function(e) {
			var entry_id = this.getAttribute('data-id');
			$.ajax({
				url: '/api_annotation/',
				type: 'post',
				data: {
					action: 'delete',
					entry_id: entry_id,
				},
				success: function(xhr) {
					_this.update();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						notify('error', xhr.responseText);
					}
				}
			});
		}).on('click', '.comment.form div.submit', function(e) {
			var content = _this.find('.feed-forms .comment.form textarea').val();
			if ($.trim(content).length == 0) {
				notify('error', 'Content must not be empty.');
				return;
			}
			_this.find('.feed-forms .comment.form .button').addClass('loading');
			$.ajax({
				url: '/api_annotation/',
				type: 'post',
				data: $.extend({
					action: 'create',
					content: content,
					reply_id: _this.find('.feed-forms .comment.form span').attr('data-reply-id')
				}, _this.data()),
				success: function(xhr) {
					_this.update();
					_this.find('.feed-forms .comment.form textarea').val('').removeAttr('css');
					_this.find('.feed-forms .comment.form span').text('Add a comment').removeAttr('data-reply-id');
					_this.find('.feed-forms .comment.form .button').removeClass('loading');
					if (_this.data('type') == 'highlight') { // only work for doc view
						_this.find('.feed-forms .claim.form').hide();
						_this.find('.feed-forms').hide();
					}
				},
				error: function(xhr) {
					_this.find('.feed-forms .comment.form .button').removeClass('loading');
					if (xhr.status == 403) {
						notify('error', xhr.responseText);
					}
				}
			});
		}).on('click', '.claim.form div.submit', function(e) {
			var content = _this.find('.feed-forms .claim.form textarea').val();
			if ($.trim(content).length == 0) {
				notify('error', 'Content must not be empty.');
				return;
			}
			_this.find('.feed-forms .claim.form .button').addClass('loading');
			$.ajax({
				url: '/api_claim/',
				type: 'post',
				data: {
					action: 'create',
					content: content,
					highlight_id: _this.data('id'),
					nopublish: _this.find('.feed-forms .claim.form .nopublish-wrapper').checkbox('is checked'),
				},
				success: function(xhr) {
					_this.update();
					_this.find('.feed-forms .claim.form textarea').val('').removeAttr('css');
					_this.find('.feed-forms .claim.form .button').removeClass('loading');
					_this.find('.feed-forms .claim.form').hide();
					_this.find('.feed-forms').hide();
				},
				error: function(xhr) {
					_this.find('.feed-forms .claim.form .button').removeClass('loading');
					if (xhr.status == 403) {
						notify('error', xhr.responseText);
					}
				}
			});
		}).on('click', '.comment.form div.reset', function(e) {
			_this.find('.feed-forms .comment.form textarea').val('').removeAttr('css');
			_this.find('.feed-forms .comment.form span').text('Add a comment').removeAttr('data-reply-id');
		}).on('click', '.doc-jumpto-claim', function(e) {
			var claim_id = this.getAttribute('data-id');
			CirLayout.changeTab('claim-tab', function() {
				window.default_claim.jumpTo(claim_id, 'fullscreen')
			});
		});
	} else if (action == 'update') {
		this.data(data);
		this.update();
	} else if (action == 'switch') { // only happens with doc view
		if (data.action == 'comment') {
			_this.find('.feed-forms .claim.form').hide();
			_this.find('.feed-forms .comment.form').show();
			_this.find('.feed-forms').show();
			_this.find('.feed-forms .comment.form label span').text('Add a comment').removeAttr('data-reply-id');
			_this.find('.feed-forms .comment.form textarea').focus();
		} else if (data.action == 'claim') {
			_this.find('.feed-forms .comment.form').hide();
			_this.find('.feed-forms .claim.form').show();
			_this.find('.feed-forms').show();
		}
	} else if (action == 'get_id') {
		return _this.data('id');
	}
	return this;
}