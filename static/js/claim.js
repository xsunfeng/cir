function CirClaim() {
	var _this = this;
	this.display_type = 'overview';
	// static event listeners
	$('#claim-pane').on('click', '.claim-vote-btn', function() {
		var _that = this;
		var action = _that.getAttribute('data-action');
		var $menu = $(_that).parent();
		var claim_id = $menu.attr('data-id');
		_this.vote(claim_id, action, $(_that).hasClass('active'), function(vote_data) {
			_this.updateVotingMenu($menu, vote_data);
		});
	}).on('click', '.claim-reword-btn', function() {
		$('#claim-pane .claim.reword.editor')
		.val($.trim($('#claim-pane .claim-content').text()));
		$('#claim-pane .reword.form').transition('slide down', '500ms');
	}).on('click', '.reword.form .submit.button', function() {
		// TODO submit a rewording
		var content = $('#claim-pane .claim.reword.editor').val();
		$.ajax({
			url: '/api_claim/',
			type: 'post',
			data: {
				action: 'reword',
				content: content,
				claim_id: _this.claim_id,
			},
			success: function(xhr) {
				$('#claim-activity-feed').feed('update', {
					'type': 'claim',
					'id': _this.claim_id,
				});
				$('#claim-pane .claim.reword.editor').val('');
				$('#claim-pane .reword.form').transition('slide down', '500ms');
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					notify('error', xhr.responseText);
				}
			}
		})
	}).on('click', '.reword.form .reset.button', function() {
		$('#claim-pane .claim.reword.editor').val('');
		$('#claim-pane .reword.form').transition('slide down', '500ms');
	}).on('click', '.claim-merge-btn', function() {

	}).on('click', '.claim-gotosrc-btn', function() {

	}).on('click', '.claim-flag-reword-btn', function() {
		var _that = this;
		var $menu = $(_that).parents('.claim.menu');
		var claim_id = $menu.attr('data-id');
		// TODO: prompt for a reason!
		_this.flag({
			claim_id: claim_id,
			action: 'flag',
			flag_type: 'reword',
			deflag: false
		}, function(xhr) {
			if (_this.display_type == 'fullscreen') {
				$('#claim-activity-feed').feed('update', {
					'type': 'claim',
					'id': _this.claim_id,
				});
			}
			$('#claim-pane .flag-tags[data-id="' + claim_id + '"]').html($(xhr.html).filter('.flag-tags').html());
			$('#claim-pane .flag-tags[data-id="' + claim_id + '"] div.ui.label').popup();
		});
	}).on('click', '.claim-flag-merge-btn', function() {

	}).on('click', '.theme-assign-btn', function() {
		var _that = this;
		var $menu = $(_that).parents('.claim.menu');
		var claim_id = $menu.attr('data-id');
		var theme_id = _that.getAttribute('data-id');
		_this.flag({
			claim_id: claim_id,
			theme_id: theme_id,
			action: 'theme',
			detheme: false
		}, function(xhr) {
			$('#claim-pane .theme-tags[data-id="' + claim_id + '"]').html($(xhr.html).filter('.theme-tags').html());
			$('#claim-pane .theme-tags[data-id="' + claim_id + '"] div.ui.label').popup();
		});
	}).on('click', '.theme-suggest-btn', function() {

	}).on('click', '.claim-fullscreen-btn', function() {
		var id = $(this).parents('.claim.menu').attr('data-id');
		_this.claim_id = id;
		_this._setDisplayType('fullscreen');
		_this.updateClaimPane();
	}).on('click', '.claim-show-in-list-btn', function() {
		var id = $(this).parents('.claim.menu').attr('data-id');
		_this.jumpTo(id, 'overview');
	}).on('click', '#claim-toggle-filter-btn', function() {
		$('#claim-filter-pane').transition('slide down', '500ms');
	}).on('click', '.claim-edit-btn', function() {
		// only for unpublished claims
		// just enter fullscreen
		var id = $(this).parents('.claim.menu').attr('data-id');
		_this.claim_id = id;
		_this._setDisplayType('fullscreen');
		_this.updateClaimPane();
	}).on('click', '.claim-save-btn', function() {
		if (_this.display_type == 'fullscreen') {
			var id = $(this).parents('.claim.menu').attr('data-id');
			var content = $('#claim-pane textarea.claim.editor').val();
			if ($.trim(content).length == 0) {
				notify('error', 'Content must not be empty.');
				return;
			}
			$.ajax({
				url: '/api_claim/',
				type: 'post',
				data: {
					action: 'update',
					content: content,
					nopublish: true,
					claim_id: id,
				},
				success: function(xhr) {
					notify('success', 'Claim updated.')
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						notify('error', xhr.responseText);
					}
				}
			});
		}
	}).on('click', '.claim-publish-btn', function() {
		var id = $(this).parents('.claim.menu').attr('data-id');
		// only for unpublished claims
		if (_this.display_type == 'fullscreen') {
			var content = $('#claim-pane textarea.claim.editor').val();
			if ($.trim(content).length == 0) {
				notify('error', 'Content must not be empty.');
				return;
			}
			$.ajax({
				url: '/api_claim/',
				type: 'post',
				data: {
					action: 'update',
					content: content,
					nopublish: false,
					claim_id: id,
				},
				success: function(xhr) {
					_this.updateClaimPane();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						notify('error', xhr.responseText);
					}
				}
			});
		}
	}).on('click', '.claim-delete-btn', function() {
		// only for unpublished claims
		var id = $(this).parents('.claim.menu').attr('data-id');
		$.ajax({
			url: '/api_claim/',
			type: 'post',
			data: {
				action: 'delete',
				claim_id: id,
			},
			success: function(xhr) {
				$('#claim-navigator .item[data-id="' + id + '"]').remove();
				if (_this.display_type == 'overview') {
					$('#claim-pane .claim.segment[data-id="' + id + '"]').remove();
				} else {
					delete _this.claim_id;
					_this._setDisplayType('overview');
					_this.updateClaimPane();
				}
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					notify('error', xhr.responseText);
				}
			}
		});
	}).on('click', '.flag-tags .delete.icon', function() {
		var type = $(this).parent().attr('data-type');
		var claim_id = $(this).parents('.flag-tags').attr('data-id');
		_this.flag({
			claim_id: claim_id,
			action: 'flag',
			flag_type: type,
			deflag: true
		}, function(xhr) {
			if (_this.display_type == 'fullscreen') {
				$('#claim-activity-feed').feed('update', {
					'type': 'claim',
					'id': _this.claim_id,
				});
			}
			$('#claim-pane .flag-tags[data-id="' + claim_id + '"]').html($(xhr.html).filter('.flag-tags').html());
			$('#claim-pane .flag-tags[data-id="' + claim_id + '"] div.ui.label').popup();
		});
	}).on('click', '.theme-tags .delete.icon', function() {
		var theme_id = $(this).parent().attr('data-id');
		var claim_id = $(this).parents('.theme-tags').attr('data-id');
		_this.flag({
			claim_id: claim_id,
			theme_id: theme_id,
			action: 'theme',
			detheme: true
		}, function(xhr) {
			$('#claim-pane .theme-tags[data-id="' + claim_id + '"]').html($(xhr.html).filter('.theme-tags').html());
			$('#claim-pane .theme-tags[data-id="' + claim_id + '"] div.ui.label').popup();
		});
	});

	$('#claim-navigator').on('click', 'a.item', function() {
		var claim_id = this.getAttribute('data-id');
		_this.jumpTo(claim_id); // without changing display_type
	}).on('click', '.refresh.item', function() {
		_this.updateNavigator();
	});

	// dynamic event listeners
	$('.claim-view-btn').click(function() {
		var type = this.getAttribute('data-type');
		if (_this.display_type != type) {
			_this._setDisplayType(type);
			_this.updateClaimPane();
		}
	});
	this.flag = function(data, callback) {
		$.ajax({
			url: '/api_claim_flag/',
			type: 'post',
			data: data,
			success: function(xhr) {
				if (typeof callback == 'function') {
					callback(xhr);
				}
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					notify('error', xhr.responseText);
				}
			}
		});
	};
	this.vote = function(claim_id, type, unvote, callback) {
		$.ajax({
			url: '/api_claim_vote/',
			type: 'post',
			data: {
				action: 'vote',
				claim_id: claim_id,
				type: type,
				unvote: unvote
			},
			success: function(xhr) {
				if (typeof callback == 'function') {
					callback(xhr.voters); // update voting menu
				}
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					notify('error', xhr.responseText);
				}
			}
		})
	};
	this._setDisplayType = function(display_type) {
		$('.item.claim-view-btn').removeClass('active');
		$('.item.claim-view-btn[data-type=' + display_type + ']').addClass('active');
		_this.display_type = display_type;
	};
	this.jumpTo = function(claim_id, display_type) {
		if (typeof display_type != 'undefined') {
			// change display type and update pane
			_this._setDisplayType(display_type);
			if (_this.display_type == 'overview') {
				_this.updateClaimPane(function() {
					var $claim_wrapper = $('#claim-pane .claim.segment[data-id="' + claim_id + '"]');
					if ($claim_wrapper.length) {
						window.scrollTo(0, $claim_wrapper.position().top - 20); // navbar width
						$claim_wrapper.find('.claim-content').addClass('highlight-found');
						setTimeout(function() {
							$claim_wrapper.find('.claim-content').removeClass('highlight-found');
						}, 500);
					}
				});
			}
		} else {
			if (_this.display_type == 'overview') {
				var $claim_wrapper = $('#claim-pane .claim.segment[data-id="' + claim_id + '"]');
				if ($claim_wrapper.length) {
					window.scrollTo(0, $claim_wrapper.position().top - 20); // navbar width
					$claim_wrapper.find('.claim-content').addClass('highlight-found');
					setTimeout(function() {
						$claim_wrapper.find('.claim-content').removeClass('highlight-found');
					}, 500);
				}
			}
		}
		if (_this.display_type == 'fullscreen') {
			_this.claim_id = claim_id;
			_this.updateClaimPane();
		}
	};
	this.updateClaimPane = function(callback) {
		$('#claim-pane > .segment').addClass('loading'); // for fullscreen view
		$('#claim-pane > .segments').css('opacity', '0.5'); // for overview
		$('#claim-navigator a.item').removeClass('active');
		$.ajax({
			url: '/api_get_claim/',
			type: 'post',
			data: {
				'action': 'get-claim',
				'display_type': _this.display_type,
				'claim_id': _this.claim_id, // used only when display_type == 'fullscreen'
				'category': _this.category,
				'theme': _this.theme,
			},
			success: function(xhr) {
				$('#claim-pane').html(xhr.html);
				$('#claim-pane > .segment').removeClass('loading');

				if (_this.display_type == 'fullscreen') {
					if (xhr.claim_id) _this.claim_id = xhr.claim_id; // undefined if no claim exists
					$('#claim-navigator a.item[data-id="' + _this.claim_id + '"]').addClass('active');
					// TODO scroll to the current claim in the navigator

					if ($('#claim-pane textarea.claim.editor').length) { // this is unpublished!
						$('#claim-pane textarea.claim.editor').focus();
					} else {
						// load activities
						$('#claim-activity-feed').feed('update', { // async
							'type': 'claim',
							'id': _this.claim_id,
						});
						$('#claim-activity-feed').feed('init');
						_this.loadRatings();
						$('#claim-pane .ratings .rating').rating({
							initialRating: 4,
							maxRating: 5,
						});
					}
				} else if (_this.display_type == 'overview') {
					// initialize filters
					$('#claim-pane .ui.category.dropdown').dropdown({
						action: function(text, value) {
							if (value == 'all') {
								delete _this.category;
							} else {
								_this.category = value;
							}
							_this.updateClaimPane();
							_this.updateNavigator();
							delete _this.claim_id;
						}
					});
					if ('category' in _this)
						$('#claim-pane .ui.category.dropdown').dropdown('set selected', _this.category)
					$('#claim-pane .ui.theme.dropdown').dropdown({
						action: function(text, value) {
							if (value == 'all') {
								delete _this.theme;
							} else {
								_this.theme = value;
							}
							_this.updateClaimPane();
							_this.updateNavigator();
							delete _this.claim_id;
						}
					});
					if ('theme' in _this)
						$('#claim-pane .ui.theme.dropdown').dropdown('set selected', _this.theme)
				}
				// initialize menu/button popups
				$('#claim-pane .menu .item').popup();
				$('#claim-pane abbr').popup();
				_this.loadVotes();
				_this.loadFlags();
				if (typeof callback == 'function') {
					callback();
				}
			},
			error: function(xhr) {
				$('#claim-pane > .segment').removeClass('loading');
				if (xhr.status == 403) {
					notify('error', xhr.responseText);
				}
			}
		});
	};
	this.updateVotingMenu = function($menu, vote_data) {
		$menu.find('.claim-vote-btn').each(function() {
			var vote_type = this.getAttribute('data-action');
			var voter_names = vote_data[vote_type];
			var my_votes = vote_data['my_votes'] ? vote_data['my_votes'] : '';
			var i_voted = my_votes.indexOf(vote_type) > -1;
			var voter_cnt = voter_names.length; // doesn't include myself
			if (voter_cnt == 0 && ! i_voted) { // nobody voted at all
				$(this).removeClass('active');
				if (vote_type == 'prioritize') {
					var title = 'Prioritize this claim';
				} else {
					var title = 'Vote as ' + vote_type;
				}
			} else {
				if (i_voted) {
					voter_cnt ++;
					$(this).addClass('active');
					voter_names.unshift('You');
				} else {
					$(this).removeClass('active');
				}
				if (vote_type == 'prioritize') {
					var title = voter_names.join(', ') + ' prioritized this claim';
				} else {
					var title = voter_names.join(', ') + ' voted as ' + vote_type;
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
	this.loadRatings = function() {
		// TODO load ratings of claim _this.claim_id
	};
	this.loadFlags = function() {
		$.ajax({
			url: '/api_get_flags/',
			type: 'post',
			data: {
				action: _this.display_type == 'fullscreen' ? 'load_single' : 'load_all',
				claim_id: _this.claim_id,
			},
			success: function(xhr) {
				if (_this.display_type == 'fullscreen') {
					$('#claim-pane .flag-tags[data-id="' + _this.claim_id + '"]').html($(xhr.html).filter('.flag-tags').html());
					$('#claim-pane .flag-tags[data-id="' + _this.claim_id + '"] div.ui.label').popup();
					$('#claim-pane .theme-tags[data-id="' + _this.claim_id + '"]').html($(xhr.html).filter('.theme-tags').html());
					$('#claim-pane .theme-tags[data-id="' + _this.claim_id + '"] div.ui.label').popup();
				} else if (_this.display_type == 'overview') {
					$('#claim-pane .flag-tags').each(function() {
						var claim_id = this.getAttribute('data-id');
						$(this).html($(xhr[claim_id]).filter('.flag-tags').html());
					});
					$('#claim-pane .flag-tags div.ui.label').popup();
					$('#claim-pane .theme-tags').each(function() {
						var claim_id = this.getAttribute('data-id');
						$(this).html($(xhr[claim_id]).filter('.theme-tags').html());
					});
					$('#claim-pane .theme-tags div.ui.label').popup();
				}
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					notify('error', xhr.responseText);
				}
			}
		});
	};
	this.loadVotes = function() {
		$('.claim.menu .claim-vote-btn').addClass('disabled');
		$.ajax({
			url: '/api_claim_vote/',
			type: 'post',
			data: {
				action: _this.display_type == 'fullscreen' ? 'load_single' : 'load_all',
				claim_id: _this.claim_id,
			},
			success: function(xhr) {
				if (_this.display_type == 'fullscreen') {
					_this.updateVotingMenu($('#claim-pane .claim.menu'), xhr['voters']);
				} else if (_this.display_type == 'overview') {
					$('#claim-pane .claim.menu').each(function() {
						if (_this.display_type != 'overview') return; // prevent users' fast view switching!
						var claim_id = this.getAttribute('data-id');
						_this.updateVotingMenu($(this), xhr[claim_id]);
					});
				}
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					notify('error', xhr.responseText);
				}
			}
		});
	}
	this.updateNavigator = function() {
		$('#claim-navigator').css('opacity', '0.5');
		$.ajax({
			url: '/api_get_claim/',
			type: 'post',
			data: {
				'action': 'navigator',
				'category': _this.category,
				'theme': _this.theme,
			},
			success: function(xhr) {
				$('#claim-navigator').css('opacity', '1.0');
				$('#claim-navigator').html(xhr.html);
			},
			error: function(xhr) {
				$('#claim-navigator').css('opacity', '1.0');
				if (xhr.status == 403) {
					notify('error', xhr.responseText);
				}
			}
		});
	}
}
