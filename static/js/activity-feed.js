jQuery.fn.feed = function(action, data, update_callback) {
	var _this = this;

	this.update = function() {
		if (_this.updater) {
			_this.updater.abort();
		}
		if (this.data('type') == 'highlight') { // load activity feed on a highlight
			this.data('highlight_id', this.data('id'));
			var url = '/api_annotation/';
		} else if (this.data('type') == 'claim') {
			this.data('claim_id', this.data('id'));
			var url = '/api_claim_activities/';
		}
		_this.updater = $.ajax({
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
					if (sessionStorage.simulated_user_id) {
						if ($(el).find('.user').attr('data-id') == sessionStorage.simulated_user_id) {
							$(el).find('.feed-delete-post, .feed-delete-claim').show();
						}
					} else {
						if ($(el).find('.user').attr('data-id') == sessionStorage.user_id) {
							$(el).find('.feed-delete-post, .feed-delete-claim').show();
						}
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
				if (_this.data('type') == 'claim' && window.default_claim.display_type == 'fullscreen') {
					// load votes on alternative versions
					$('#claim-activity-feed .improve.menu').each(function() {
						var $menu = $(this);
						if (window.default_claim.display_type != 'fullscreen') return; // prevent users' fast view switching!
						var version_id = this.getAttribute('data-id');
						$.ajax({
							url: '/api_claim_vote/',
							type: 'post',
							data: {
								action: 'load version', // not expecting too many of them
								version_id: version_id,
							},
							success: function(xhr) {
								_this.updateVotingMenu($menu, xhr.voters);
							},
							error: function(xhr) {
								if (xhr.status == 403) {
									notify('error', xhr.responseText);
								}
							}
						});
					});
				}
				_this.find('.ui.checkbox').checkbox();
				if (sessionStorage['simulated_user_role'] && sessionStorage['simulated_user_role'] == 'facilitator' || (! sessionStorage['simulated_user_role']) && sessionStorage['role'] == 'facilitator') {
					_this.find('.facilitator-only').show();
				}
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

	this.updateVotingMenu = function($menu, vote_data) {
		$menu.find('.feed-like-claim-version').each(function() {
			var vote_type = this.getAttribute('data-action');
			var voter_names = vote_data[vote_type];
			var my_votes = vote_data['my_votes'] ? vote_data['my_votes'] : '';
			var i_voted = my_votes.indexOf(vote_type) > -1;
			var voter_cnt = voter_names.length; // doesn't include myself
			if (voter_cnt == 0 && ! i_voted) { // nobody voted at all
				$(this).removeClass('active');
				if (vote_type == 'like') {
					var title = 'Like this version';
				}
			} else {
				if (i_voted) {
					voter_cnt ++;
					$(this).addClass('active');
					voter_names.unshift('You');
				} else {
					$(this).removeClass('active');
				}
				if (vote_type == 'like') {
					var title = voter_names.join(', ') + ' like this version';
				}
			}
			$(this).popup({content: title});
			if (voter_cnt > 0) {
				$(this).find('span').text(voter_cnt);
			} else {
				$(this).find('span').text('');
			}
			$(this).removeClass('disabled');
		});
	};

	if (action == 'init') {
		// listeners
		this.on('click', '.feed-reply-post', function(e) {
			var name = $(this).parents('.event').find('.user').text();
			var entry_id = this.getAttribute('data-id');
			_this.find('.feed-forms .claim.form').hide();
			_this.find('.feed-forms .comment.form span').attr('data-reply-id', entry_id).text('Reply to ' + name);
			_this.find('.feed-forms .comment.form').show();
			_this.find('.feed-forms').show();
			_this.find('.feed-forms .comment.form textarea').focus();
		}).on('click', '.feed-delete-post', function(e) {
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
		}).on('click', '.feed-delete-claim', function(e) {
			var id = $(this).parent().attr('data-id');
			$.ajax({
				url: '/api_claim/',
				type: 'post',
				data: {
					action: 'delete version',
					version_id: id,
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
		}).on('click', '.feed-like-claim-version', function(e) {
			var _that = this;
			var $menu = $(this).parent()
			var id = $menu.attr('data-id');
			$.ajax({
				url: '/api_claim_vote/',
				type: 'post',
				data: {
					action: 'like version',
					version_id: id,
					unvote: $(_that).hasClass('active'),
				},
				success: function(xhr) {
					_this.updateVotingMenu($menu, xhr.voters);
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						notify('error', xhr.responseText);
					}
				}
			});
		}).on('click', '.feed-diff-claim-version', function() {
			var $current_text = $(this).parents('.event').find('.improved.text');
			var text = $current_text.text();
			if ($(this).text() == 'Show difference') {
				_this.tempOrigText = text;
				var adopted_text = $('#claim-pane .claim-content').text();
				var diff = StringDiff.diffString(adopted_text, text);
				$current_text.html(diff);
				$(this).text('Hide difference');
			} else {
				$current_text.text(_this.tempOrigText);
				delete _this.tempOrigText;
				$(this).text('Show difference');
			}
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
					reply_id: _this.find('.feed-forms .comment.form span').attr('data-reply-id'),
					collective: _this.find('.ui.checkbox').checkbox('is checked'),
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
				},
				complete: function() {
					_this.find('.collective-wrapper').checkbox('uncheck');
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