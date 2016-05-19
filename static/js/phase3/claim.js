define([
	'jquery',
	'claim-common/claim-navigator',
	'utils',
	'feed/activity-feed',
	'semantic-ui'
], function(
	$,
	ClaimNavigator,
	Utils
) {
	var module = {};
	module.initClaimView = function() {
		$('#claim-container .claim-view-btn').tab();
		this.display_type = 'overview';
		// static event listeners
		$('#claim-container').on('click', '.claim-vote-btn:not(.disabled):not(.unready)', function() {
			var _that = this;
			var action = _that.getAttribute('data-action');
			var $menu = $(_that).parent();
			var claim_id = $menu.attr('data-id');
			vote(claim_id, action, $(_that).hasClass('active'), function(vote_data) {
				_updateVotingMenu($menu, vote_data);
				if (module.display_type == 'fullscreen') {
					$('#claim-activity-feed').feed('update');
				}
			});
		}).on('click', '.claim-duplicate-btn', function() {
			$.ajax({
				url: '/api_claim/',
				type: 'post',
				data: {
					action: 'duplicate',
					claim_id: module.claim_id,
				},
				success: function(xhr) {
					module.updateClaimPane();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}).on('click', '.claim-gotosrc-btn', function() {

		}).on('click', '.claim-back-to-list-btn', function() {
			var id = $(this).parents('.claim.menu').attr('data-id');
			module.jumpTo(id, 'overview');
		}).on('click', '.claim-edit-btn', function() {
			// only for unpublished claims
			// must enter fullscreen
			module.claim_id = $(this).parents('.claim.menu').attr('data-id');
			_setDisplayType('fullscreen');
			module.updateClaimPane();
		}).on('click', '.claim-save-btn', function() {
			if (module.display_type == 'fullscreen') {
				var id = $(this).parents('.claim.menu').attr('data-id');
				var content = $('#claim-pane textarea.claim.editor').val();
				if ($.trim(content).length == 0) {
					Utils.notify('error', 'Content must not be empty.');
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
						Utils.notify('success', 'Claim saved.')
					},
					error: function(xhr) {
						if (xhr.status == 403) {
							Utils.notify('error', xhr.responseText);
						}
					}
				});
			}
		}).on('click', '.claim-publish-btn', function() {
			var id = $(this).parents('.claim.menu').attr('data-id');
			// only for unpublished claims
			if (module.display_type == 'fullscreen') {
				var content = $('#claim-pane textarea.claim.editor').val();
				if ($.trim(content).length == 0) {
					Utils.notify('error', 'Content must not be empty.');
					return;
				}
				$.ajax({
					url: '/api_claim/',
					type: 'post',
					data: {
						action: 'update',
						content: content,
						nopublish: false,
						claim_id: module.claim_id,
					},
					success: function(xhr) {
						module.updateClaimPane();
					},
					error: function(xhr) {
						if (xhr.status == 403) {
							Utils.notify('error', xhr.responseText);
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
					ClaimNavigator.removeItem(id);
					if (module.display_type == 'overview') {
						$('#claim-pane .claim.segment[data-id="' + id + '"]').remove();
					} else {
						delete module.claim_id;
						_setDisplayType('overview');
						module.updateClaimPane();
					}
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});

		$('#claim-pane-overview').on('click', '.claim-fullscreen-btn', function() {
			module.claim_id = $(this).parents('.claim.menu').attr('data-id');
			_setDisplayType('fullscreen');
			module.updateClaimPane();
		});


		// dynamic event listeners
		$('.claim-view-btn').click(function() {
			var type = this.getAttribute('data-tab');
			if (module.display_type != type) {
				_setDisplayType(type);
				module.updateClaimPane();
			}
		});
	};

	function vote(claim_id, type, unvote, callback) {
		// if you are (or pretend to be) a facilitator
		if (sessionStorage['simulated_user_role'] && sessionStorage['simulated_user_role'] == 'facilitator' || (!sessionStorage['simulated_user_role']) && sessionStorage['role'] == 'facilitator') {
			// change category
			$.ajax({
				url: '/api_claim/',
				type: 'post',
				data: {
					action: 'change category',
					claim_id: claim_id,
					type: type,
				},
				success: function(xhr) {
					Utils.notify('success', 'The claim has been categorized.');
					module.updateClaimPane();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		} else {
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
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}
	}

	function _setDisplayType(display_type) {
		$('#claim-container .claim-view-btn').tab('change tab', display_type);
		module.display_type = display_type;
	}

	/**
	 * Jump to a specific claim.
	 * @param claim_id Destination claim.
	 * @param display_type (optional) If specified, switch to specified display type first.
	 */
	module.jumpTo = function(claim_id, display_type) {
		$('#claim-pane-overview .claim.segment .claim-content').removeClass('highlight-found');
		ClaimNavigator.highlight();
		if (typeof display_type != 'undefined') {
			// change display type and update pane
			_setDisplayType(display_type);
			if (module.display_type == 'overview') {
				var $claim_wrapper = $('#claim-pane-overview .claim.segment[data-id="' + claim_id + '"]');
				if ($claim_wrapper.length) {
					window.scrollTo(0, $claim_wrapper.position().top - 20); // navbar width
					$claim_wrapper.addClass('highlight-found');
					setTimeout(function() {
						$claim_wrapper.removeClass('highlight-found');
					}, 1000);
				}
			}
		} else {
			if (module.display_type == 'overview') {
				var $claim_wrapper = $('#claim-pane-overview .claim.segment[data-id="' + claim_id + '"]');
				if ($claim_wrapper.length) {
					window.scrollTo(0, $claim_wrapper.position().top - 20); // navbar width
					if ($claim_wrapper.hasClass('accordion')) {
						$claim_wrapper.addClass('highlight-found');
						setTimeout(function() {
							$claim_wrapper.removeClass('highlight-found');
						}, 1000);
					} else {
						$claim_wrapper.addClass('highlight-found');
						setTimeout(function() {
							$claim_wrapper.removeClass('highlight-found');
						}, 1000);
					}
				}
			}
		}
		if (module.display_type == 'fullscreen') {
			module.claim_id = claim_id;
			module.updateClaimPane();
		}
	};
	module.updateClaimPane = function() {
		if (module.claimLoader) {
			module.claimLoader.abort();
		}
		$('#claim-container .active.tab').addClass('loading');
		ClaimNavigator.setActive();

		module.claimLoader = $.ajax({
			url: '/api_get_claim/',
			type: 'post',
			data: {
				'action': 'get-claim',
				'display_type': module.display_type,
				'claim_id': module.claim_id, // used only when display_type == 'fullscreen'
				'category': ClaimNavigator.currentCategory,
				'theme': ClaimNavigator.currentTheme,
			},
			success: function(xhr) {
				$('#claim-container .active.tab').removeClass('loading');
				if (module.display_type == 'overview') {
					$('#claim-pane-overview').html(xhr.html);
					$('.ui.accordion').accordion({'close nested': false});
				} else if (module.display_type == 'fullscreen') {
					$('#claim-pane-fullscreen').html(xhr.html);
					if (xhr.claim_id) module.claim_id = xhr.claim_id; // undefined if no claim exists
					ClaimNavigator.setActive(module.claim_id);

					if ($('#claim-pane-fullscreen textarea.claim.editor').length) { // this is unpublished!
						$('#claim-pane-fullscreen textarea.claim.editor').focus();
					} else {
						// load activities
						$('#claim-activity-feed').feed('init');
						var filter = 'all';
						if ($('body').attr('data-phase') == 'extract') {
							filter = 'general';
						} else if ($('body').attr('data-phase') == 'categorize') {
							filter = 'categorize';
						} else if ($('body').attr('data-phase') == 'theming') {
							filter = 'theming';
						} else if ($('body').attr('data-phase') == 'improve') {
							filter = 'improve';
						}
						$('#claim-activity-feed').feed('update', { // async
							'type': 'claim',
							'id': module.claim_id,
							'filter': filter
						});
						//loadRatings();
						//$('#claim-pane .ratings .rating').rating({
						//	initialRating: 4,
						//	maxRating: 5,
						//});
					}
				}
				// initialize menu/button popups
				// $('#claim-pane .menu .item').popup();
				// $('#claim-pane abbr').popup();
				// $('#claim-pane .merged.label').popup();
				if (sessionStorage['simulated_user_role'] && sessionStorage['simulated_user_role'] == 'facilitator' || (!sessionStorage['simulated_user_role']) && sessionStorage['role'] == 'facilitator') {
					$('#claim-container .facilitator-only').show();
				}
				if ($('#claim-container .claim.segment').length) { // make sure non-empty claim list
					loadVotes();
				}
				if ($('body').attr('data-phase') == 'improve') {
					initStmtHandles();
				}
			},
			error: function(xhr) {
				$('#claim-pane > .segment').removeClass('loading');
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
		return module.claimLoader;
	};
	function loadRatings() {
		// TODO load ratings of claim module.claim_id
	}

	function loadVotes() {
		$('.claim.menu .claim-vote-btn').addClass('unready');
		module.voteLoader = $.ajax({
			url: '/api_claim_vote/',
			type: 'post',
			data: {
				action: module.display_type == 'fullscreen' ? 'load_single' : 'load_all',
				claim_id: module.claim_id,
			},
			success: function(xhr) {
				if (module.display_type == 'fullscreen') {
					_updateVotingMenu($('#claim-pane-fullscreen .claim.menu'), xhr['voters']);
				} else if (module.display_type == 'overview') {
					$('#claim-pane-overview .claim.menu').each(function() {
						var claim_id = this.getAttribute('data-id');
						_updateVotingMenu($(this), xhr[claim_id]);
					});
				}
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}

	function _updateVotingMenu($menu, vote_data) {
		$menu.find('.claim-vote-btn').each(function() {
			var vote_type = this.getAttribute('data-action');
			var voter_names = vote_data[vote_type];
			var my_votes = vote_data['my_votes'] ? vote_data['my_votes'] : '';
			var i_voted = my_votes.indexOf(vote_type) > -1;
			var voter_cnt = voter_names.length; // doesn't include myself
			if (voter_cnt == 0 && !i_voted) { // nobody voted at all
				$(this).removeClass('active');
				if (vote_type == 'prioritize') {
					var title = 'Prioritize this claim';
				} else {
					var title = 'Vote as ' + vote_type;
				}
			} else {
				if (i_voted) {
					voter_cnt++;
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
			$(this).removeClass('unready');
		});
	}

	module.initClaimView();
	module.updateClaimPane();
	ClaimNavigator.updateNavigator();
	return module;
});