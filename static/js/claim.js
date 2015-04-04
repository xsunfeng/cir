function CirClaim() {
	var _this = this;
	this.display_type = 'overview';
	// dynamic event listeners
	$('#claim-pane').on('click', '.claim-vote-btn', function() {
		var _that = this;
		var action = _that.getAttribute('data-action');
		var $menu = $(_that).parent();
		var claim_id = $menu.attr('data-id');
		_this.vote(claim_id, action, $(_that).hasClass('active'), function(vote_data) {
			_this.updateVotingMenu($menu, vote_data);
		});
	}).on('click', '.claim-revise-btn', function() {

	}).on('click', '.claim-merge-btn', function() {

	}).on('click', '.claim-gotosrc-btn', function() {

	}).on('click', '.claim-fullscreen-btn', function() {
		var id = this.getAttribute('data-id');
		_this.claim_id = id;
		_this._setDisplayType('fullscreen');
		_this.updateClaimPane();
	}).on('click', '#claim-toggle-filter-btn', function() {
		$('#claim-filter-pane').toggleClass('hidden');
	});
	$('#claim-navigator').on('click', 'a.item', function() {
		var claim_id = this.getAttribute('data-id');
		_this.jumpTo(claim_id);
	});

	// static event listeners
	$('.claim-view-btn').click(function() {
		var type = this.getAttribute('data-type');
		if (_this.display_type != type) {
			_this._setDisplayType(type);
			_this.updateClaimPane();
		}
	});
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
			_this._setDisplayType(display_type);
		}
		if (_this.display_type == 'overview') {
			// TODO scroll to that claim
		} else if (_this.display_type == 'fullscreen') {
			_this.claim_id = claim_id;
			_this.updateClaimPane();
		}
	};
	this.updateClaimPane = function() {
		$('#claim-pane > .segment').addClass('loading');
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
					// if full screen view, also load activities
					$('#claim-activity-feed').feed('update', { // async
						'type': 'claim',
						'id': _this.claim_id,
					});
					$('#claim-navigator a.item[data-id="' + _this.claim_id + '"]').addClass('active');
					$('#claim-activity-feed').feed('init');
					// TODO scroll to the current claim in the navigator

					_this.loadRatings();
					$('#claim-pane .ratings .rating').rating({
						initialRating: 4,
						maxRating: 5,
					});
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
					_this.updateVotingMenu($('#claim-pane'), xhr['voters']);
				} else if (_this.display_type == 'overview') {
					$('#claim-pane .claim.menu').each(function() {
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
		$.ajax({
			url: '/api_get_claim/',
			type: 'post',
			data: {
				'action': 'navigator',
				'category': _this.category,
				'theme': _this.theme,
			},
			success: function(xhr) {
				$('#claim-navigator').html(xhr.html).find('.vertical.menu').height(window.innerHeight - 100);
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					notify('error', xhr.responseText);
				}
			}
		});
	}
}
