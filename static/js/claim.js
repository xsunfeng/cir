define([
	'utils'
], function(
	Utils
) {
	var module = {};
	module.initClaimView = function() {
		var _this = this;
		this.display_type = 'overview';
		// static event listeners
		$('#claim-pane').on('click', '.claim-vote-btn:not(.disabled):not(.unready)', function() {
			var _that = this;
			var action = _that.getAttribute('data-action');
			var $menu = $(_that).parent();
			var claim_id = $menu.attr('data-id');
			vote(claim_id, action, $(_that).hasClass('active'), function(vote_data) {
				_updateVotingMenu($menu, vote_data);
				if (_this.display_type == 'fullscreen') {
					$('#claim-activity-feed').feed('update');
				}
			});
		}).on('click', '.claim-reword-btn', function() {
			$('#claim-pane .reword.form input[name="collective"]').val('false');
			$('#claim-pane .claim.reword.editor')
				.val($.trim($('#claim-pane .claim-content').text()));
			$('#claim-pane .reword.form').transition('slide down', '500ms');
		}).on('click', '.reword.form .submit.button', function() {
			var content = $('#claim-pane .claim.reword.editor').val();
			if ($.trim(content).length == 0) {
				Utils.notify('error', 'Content must not be empty.');
				return;
			}
			var collective = $('#claim-pane .reword.form input[name="collective"]').val();
			$.ajax({
				url: '/api_claim/',
				type: 'post',
				data: {
					action: 'reword',
					content: content,
					claim_id: _this.claim_id,
					collective: collective
				},
				success: function(xhr) {
					if (collective == 'true') {
						// the new version is adopted!
						module.updateClaimPane();
					} else {
						$('#claim-activity-feed').feed('update', {
							'type': 'claim',
							'id': _this.claim_id,
						});
						$('#claim-pane .claim.reword.editor').val('');
						$('#claim-pane .reword.form').transition('slide down', '500ms');
					}
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			})
		}).on('click', '.reword.form .reset.button', function() {
			$('#claim-pane .claim.reword.editor').val('');
			$('#claim-pane .reword.form').transition('slide down', '500ms');
		}).on('click', '.claim-merge-btn', function() {
			Utils.notify('warning', 'Please switch to Overview and try again.');
		}).on('click', '.claim-gotosrc-btn', function() {

		}).on('click', '.claim-flag-reword-btn', function() {
			var version_id = $(this).parent().attr('data-id');
			$('#claim-reason-editor input[name="version_id"]').val(version_id);
			$('#claim-reason-editor input[name="collective"]').val(this.getAttribute('data-collective'));
			$('#claim-reason-editor').modal('show');
		}).on('click', '.claim-flag-merge-btn', function() {
			if (_this.display_type != 'overview') {
				Utils.notify('warning', 'Please switch to Overview and try again.');
				return;
			}
			var $segment = $(this).parents('.claim.segment');
			$segment.find('.merge.corner.label').show();
			$('#claim-pane .filter.segment').hide();
			$('#claim-pane .merging.segment').show();
			$('#claim-pane .merging.segment .merge.count').text($('#claim-pane .merge.corner.label:visible').length);
		}).on('click', '.theme-assign-btn', function() {
			var _that = this;
			var $menu = $(_that).parents('.claim.menu');
			var claim_id = $menu.attr('data-id');
			var theme_id = _that.getAttribute('data-id');
			flag({
				claim_id: claim_id,
				theme_id: theme_id,
				action: 'theme',
				detheme: false
			}, function(xhr) {
				if (_this.display_type == 'fullscreen') {
					$('#claim-activity-feed').feed('update');
				}
				$('#claim-pane .theme-tags[data-id="' + claim_id + '"]').html($(xhr.html).filter('.theme-tags').html());
				// $('#claim-pane .theme-tags[data-id="' + claim_id + '"] div.ui.label').popup();
			});
		}).on('click', '.theme-suggest-btn', function() {

		}).on('click', '.claim-fullscreen-btn', function() {
			_this.claim_id = $(this).parents('.claim.menu').attr('data-id');
			_setDisplayType('fullscreen');
			module.updateClaimPane();
		}).on('click', '.claim-back-to-list-btn', function() {
			var id = $(this).parents('.claim.menu').attr('data-id');
			module.jumpTo(id, 'overview');
		}).on('click', '#claim-toggle-filter-btn', function() {
			$('#claim-filter-pane').transition('slide down', '500ms');
		}).on('click', '.claim-edit-btn', function() {
			// only for unpublished claims
			// just enter fullscreen
			_this.claim_id = $(this).parents('.claim.menu').attr('data-id');
			_setDisplayType('fullscreen');
			module.updateClaimPane();
		}).on('click', '.claim-save-btn', function() {
			if (_this.display_type == 'fullscreen') {
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
			if (_this.display_type == 'fullscreen') {
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
						claim_id: _this.claim_id,
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
					$('#claim-navigator .item[data-id="' + id + '"]').remove();
					if (_this.display_type == 'overview') {
						$('#claim-pane .claim.segment[data-id="' + id + '"]').remove();
					} else {
						delete _this.claim_id;
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
		}).on('click', '.reword-flag-tags .delete.icon', function() {
			var version_id = $(this).parents('.reword-flag-tags').attr('data-id');
			flag({
				version_id: version_id,
				action: 'flag',
				flag_type: 'reword',
				deflag: true
			}, function(xhr) {
				if (_this.display_type == 'fullscreen') {
					$('#claim-activity-feed').feed('update');
				}
				$('#claim-pane .reword-flag-tags[data-id="' + version_id + '"]').html($(xhr.html).filter('.reword-flag-tags').html());
				// $('#claim-pane .reword-flag-tags[data-id="' + version_id + '"] div.ui.label').popup();
			});
		}).on('click', '.merge-flag-tags .delete.icon', function(e) {
			e.stopPropagation();
			var claim_id = $(this).parents('.merge-flag-tags').attr('data-id');
			flag({
				claim_id: claim_id,
				action: 'flag',
				flag_type: 'merge',
				deflag: true
			}, function(xhr) {
				if (_this.display_type == 'fullscreen') {
					$('#claim-activity-feed').feed('update', {
						'type': 'claim',
						'id': _this.claim_id,
					});
				} else {
					loadFlags();
				}
			});
		}).on('click', '.theme-tags .delete.icon', function() {
			var theme_id = $(this).parent().attr('data-id');
			var claim_id = $(this).parents('.theme-tags').attr('data-id');
			flag({
				claim_id: claim_id,
				theme_id: theme_id,
				action: 'theme',
				detheme: true
			}, function(xhr) {
				if (_this.display_type == 'fullscreen') {
					$('#claim-activity-feed').feed('update');
				}
				$('#claim-pane .theme-tags[data-id="' + claim_id + '"]').html($(xhr.html).filter('.theme-tags').html());
				// $('#claim-pane .theme-tags[data-id="' + claim_id + '"] div.ui.label').popup();
			});
		}).on('click', '.merge.corner.label', function() {
			$(this).removeClass('visible').hide();
			$('#claim-pane .merging.segment .merge.count').text($('#claim-pane .merge.corner.label:visible').length);
			if ($('#claim-pane .merge.corner.label:visible').length == 0) {
				$('#claim-pane .filter.segment').show();
				$('#claim-pane .merging.segment').hide();
			}
		}).on('click', '.merge-flag-tags .tag.label', function(e) {
			e.stopPropagation();
			var claim_ids = this.getAttribute('data-ids').split('.');
			highlightClaims(claim_ids);
		}).on('click', '#claim-label-merge', function() {
			var claim_ids = [];
			var valid_merge = true;
			$('#claim-pane .merge.corner.label:visible').each(function() {
				if ($(this).parent().find('.merge-flag-tags .merge.tag.label').length) {
					valid_merge = false;
				}
				claim_ids.push($(this).parent().attr('data-id'));
			});
			if (claim_ids.length < 2) {
				Utils.notify('warning', 'Please select two or more claims to merge.');
				return;
			}
			if (!valid_merge) {
				Utils.notify('warning', 'Selected claim(s) are already labeled to be merged -- please wait until the pending merge is resolved.');
			} else {
				flag({
					action: 'flag',
					flag_type: 'merge',
					deflag: false,
					claim_ids: claim_ids.join(' ')
				}, function(xhr) {
					// must be in Overview at this time
					loadFlags();
					$('#claim-pane .merge.corner.label').each(function() {
						$(this).removeClass('visible').hide();
					});
					$('#claim-pane .filter.segment').show();
					$('#claim-pane .merging.segment').hide();
				});
			}
		}).on('click', '#claim-perform-merge', function() {
			var claim_ids = [];
			var content = [];
			$('#claim-pane .merge.corner.label:visible').each(function() {
				var $segment = $(this).parent();
				claim_ids.push($segment.attr('data-id'));
				content.push($segment.find('.claim-content').text());
				content.push('<div class="ui divider"></div>');
			});
			if (claim_ids.length < 2) {
				Utils.notify('warning', 'Please select two or more claims to merge.');
				return;
			}
			$('#claim-merge-editor input').val(claim_ids.join(' '));
			$('#claim-merge-editor .claim-content').html(content.join(''));
			$('#claim-merge-editor').modal('show');
		}).on('click', '#claim-clear-selection', function() {
			$('#claim-pane .merge.corner.label').each(function() {
				$(this).removeClass('visible').hide();
			});
			$('#claim-pane .filter.segment').show();
			$('#claim-pane .merging.segment').hide();
		}).on('click', '.merged.label', function() {
			var action = this.getAttribute('data-action');
			var claim_ids = this.getAttribute('data-ids').split('.');
			if (action == 'view-newer') {
				if (claim_ids.length == 1) {
					module.jumpTo(claim_ids[0]);
				} else {
					highlightClaims(claim_ids);
				}
			} else { // when action == 'view-older' or no action at all
				highlightClaims(claim_ids);
			}
		}).on('click', '.feed-reword-claim', function() {
			$('#claim-pane .reword.form input[name="collective"]').val('true');
			$('#claim-pane .claim.reword.editor')
				.val($.trim($('#claim-pane .claim-content').text()));
			$('#claim-pane .reword.form').transition('slide down', '500ms');
		});

		$('#claim-reason-editor').on('click', '.primary.button', function() {
			var reason = $('#claim-reason-editor textarea.reason.editor').val();
			var collective = $('#claim-reason-editor input[name="collective"]').val();
			var version_id = $('#claim-reason-editor input[name="version_id"]').val();
			if ($.trim(reason).length == 0 && collective == 'true') {
				Utils.notify('error', 'You must input a reason for a collective decision.');
				return;
			}
			flag({
				version_id: version_id,
				action: 'flag',
				flag_type: 'reword',
				deflag: false,
				reason: reason,
				collective: collective
			}, function(xhr) {
				$('#claim-reason-editor').modal('hide');
				$('#claim-reason-editor textarea').val('');
				if (_this.display_type == 'fullscreen') {
					$('#claim-activity-feed').feed('update');
				}
				$('#claim-pane .reword-flag-tags[data-id="' + version_id + '"]').html($(xhr.html).filter('.reword-flag-tags').html());
				// $('#claim-pane .reword-flag-tags[data-id="' + version_id + '"] div.ui.label').popup();
			});
		});
		$('#claim-merge-editor').on('click', '.primary.button', function() {
			if ($.trim($('#claim-merge-editor textarea').val()).length == 0) {
				Utils.notify('error', 'Content must not be empty.');
				return;
			}
			$.ajax({
				url: '/api_claim/',
				type: 'post',
				data: {
					action: 'merge',
					claim_ids: $('#claim-merge-editor input').val(),
					content: $.trim($('#claim-merge-editor textarea').val()),
				},
				success: function(xhr) {
					// must be in overview now.
					module.updateClaimPane();
					module.updateNavigator();
					$('#claim-merge-editor').modal('hide');
					$('#claim-merge-editor .claim-content').text('');
					$('#claim-merge-editor input').val('');
					$('#claim-merge-editor textarea').val('');
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}).on('click', '.close.button', function() {
			$('#claim-merge-editor').modal('hide');
			$('#claim-merge-editor .claim-content').text('');
			$('#claim-merge-editor input').val('');
			$('#claim-merge-editor textarea').val('');
		});
		$('#claim-navigator').on('click', '.claim.item', function() {
			var claim_id = this.getAttribute('data-id');
			module.jumpTo(claim_id); // without changing display_type
		}).on('click', '.refresh.item', function() {
			module.updateNavigator();
		});

		// dynamic event listeners
		$('.claim-view-btn').click(function() {
			var type = this.getAttribute('data-type');
			if (_this.display_type != type) {
				_setDisplayType(type);
				module.updateClaimPane();
			}
		});
	};

	function highlightClaims(claim_ids) {
		$('#claim-pane .claim.segment .claim-content').removeClass('highlight-found');
		$('#claim-pane .claim.segment.accordion').removeClass('highlight-found');
		$('#claim-navigator .item').removeClass('highlight-found');
		for (var i = 0; i < claim_ids.length; i++) {
			if (this.display_type == 'overview') {
				if ($('#claim-pane .claim.segment[data-id="' + claim_ids[i] + '"]').hasClass('accordion')) {
					$('#claim-pane .claim.segment[data-id="' + claim_ids[i] + '"]').addClass('highlight-found');
				} else {
					$('#claim-pane .claim.segment[data-id="' + claim_ids[i] + '"] .claim-content').addClass('highlight-found');
				}
			}
			$('#claim-navigator .item[data-id="' + claim_ids[i] + '"]').addClass('highlight-found');
		}
	}

	function flag(data, callback) {
		// if you are (or pretend to be) a facilitator
		if (sessionStorage['simulated_user_role'] && sessionStorage['simulated_user_role'] == 'facilitator' || (!sessionStorage['simulated_user_role']) && sessionStorage['role'] == 'facilitator') {
			if (data.action == 'theme') {
				// must be collective
				data.collective = true;
			}
		}
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
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}

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
		$('.item.claim-view-btn').removeClass('active');
		$('.item.claim-view-btn[data-type=' + display_type + ']').addClass('active');
		module.display_type = display_type;
	}

	module.jumpTo = function(claim_id, display_type) {
		$('#claim-pane .claim.segment .claim-content').removeClass('highlight-found');
		$('#claim-navigator .item').removeClass('highlight-found');
		if (typeof display_type != 'undefined') {
			// change display type and update pane
			_setDisplayType(display_type);
			if (module.display_type == 'overview') {
				module.updateClaimPane(function() {
					var $claim_wrapper = $('#claim-pane .claim.segment[data-id="' + claim_id + '"]');
					if ($claim_wrapper.length) {
						window.scrollTo(0, $claim_wrapper.position().top - 20); // navbar width
						$claim_wrapper.find('.claim-content').addClass('highlight-found');
						setTimeout(function() {
							$claim_wrapper.find('.claim-content').removeClass('highlight-found');
						}, 1000);
					}
				});
			}
		} else {
			if (module.display_type == 'overview') {
				var $claim_wrapper = $('#claim-pane .claim.segment[data-id="' + claim_id + '"]');
				if ($claim_wrapper.length) {
					window.scrollTo(0, $claim_wrapper.position().top - 20); // navbar width
					if ($claim_wrapper.hasClass('accordion')) {
						$claim_wrapper.addClass('highlight-found');
						setTimeout(function() {
							$claim_wrapper.removeClass('highlight-found');
						}, 1000);
					} else {
						$claim_wrapper.find('.claim-content').addClass('highlight-found');
						setTimeout(function() {
							$claim_wrapper.find('.claim-content').removeClass('highlight-found');
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
	module.updateClaimPane = function(callback) {
		$('#claim-pane > .segment').addClass('loading'); // for fullscreen view
		$('#claim-pane > .segments').css('opacity', '0.5'); // for overview
		$('#claim-navigator a.item').removeClass('active');
		if (module.flagLoader) {
			module.flagLoader.abort();
		}
		if (module.voteLoader) {
			module.voteLoader.abort();
		}
		$.ajax({
			url: '/api_get_claim/',
			type: 'post',
			data: {
				'action': 'get-claim',
				'display_type': module.display_type,
				'claim_id': module.claim_id, // used only when display_type == 'fullscreen'
				'category': module.category,
				'theme': module.theme,
			},
			success: function(xhr) {
				$('#claim-pane').html(xhr.html);
				$('#claim-pane > .segment').removeClass('loading');

				if (module.display_type == 'fullscreen') {
					if (xhr.claim_id) module.claim_id = xhr.claim_id; // undefined if no claim exists
					$('#claim-navigator a.item[data-id="' + module.claim_id + '"]').addClass('active');
					// TODO scroll to the current claim in the navigator

					if ($('#claim-pane textarea.claim.editor').length) { // this is unpublished!
						$('#claim-pane textarea.claim.editor').focus();
					} else {
						// load activities
						$('#claim-activity-feed').feed('init');
						var filter = 'all';
						if ($('#claim-pane').hasClass('extract')) {
							filter = 'general';
						} else if ($('#claim-pane').hasClass('categorize')) {
							filter = 'categorize';
						} else if ($('#claim-pane').hasClass('theming')) {
							filter = 'theming';
						} else if ($('#claim-pane').hasClass('improve')) {
							filter = 'improve';
						}
						$('#claim-activity-feed').feed('update', { // async
							'type': 'claim',
							'id': module.claim_id,
							'filter': filter
						});
						loadRatings();
						$('#claim-pane .ratings .rating').rating({
							initialRating: 4,
							maxRating: 5,
						});
					}
				} else if (module.display_type == 'overview') {
					// initialize filters
					$('#claim-pane .ui.category.dropdown').dropdown({
						action: function(text, value) {
							if (value == 'all') {
								delete module.category;
							} else {
								module.category = value;
							}
							module.updateClaimPane();
							module.updateNavigator();
							delete module.claim_id;
						}
					});
					if ('category' in module) $('#claim-pane .ui.category.dropdown').dropdown('set selected', module.category)
					$('#claim-pane .ui.theme.dropdown').dropdown({
						action: function(text, value) {
							if (value == 'all') {
								delete module.theme;
							} else {
								module.theme = value;
							}
							module.updateClaimPane();
							module.updateNavigator();
							delete module.claim_id;
						}
					});
					if ('theme' in module) $('#claim-pane .ui.theme.dropdown').dropdown('set selected', module.theme)
					// $('#claim-pane .merge.corner.label').popup();
					// $('#claim-pane .merge.control').popup();
					$('#claim-pane .ui.accordion').accordion({'close nested': false});
				}
				// initialize menu/button popups
				// $('#claim-pane .menu .item').popup();
				// $('#claim-pane abbr').popup();
				// $('#claim-pane .merged.label').popup();
				if (sessionStorage['simulated_user_role'] && sessionStorage['simulated_user_role'] == 'facilitator' || (!sessionStorage['simulated_user_role']) && sessionStorage['role'] == 'facilitator') {
					$('#claim-pane .facilitator-only').show();
				}
				loadVotes();
				loadFlags();
				if (typeof callback == 'function') {
					callback();
				}
			},
			error: function(xhr) {
				$('#claim-pane > .segment').removeClass('loading');
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	};
	function loadRatings() {
		// TODO load ratings of claim module.claim_id
	}

	function loadFlags() {
		module.flagLoader = $.ajax({
			url: '/api_get_flags/',
			type: 'post',
			data: {
				action: module.display_type == 'fullscreen' ? 'load_single' : 'load_all',
				claim_id: module.claim_id,
			},
			success: function(xhr) {
				if (module.display_type == 'fullscreen') {
					$('#claim-pane .reword-flag-tags[data-id="' + xhr.version_id + '"]').html($(xhr.reword_flags).filter('.reword-flag-tags').html());
					// $('#claim-pane .reword-flag-tags[data-id="' + xhr.version_id + '"] div.ui.label').popup();
					$('#claim-pane .merge-flag-tags[data-id="' + module.claim_id + '"]').html($(xhr.merge_flags).filter('.merge-flag-tags').html());
					// $('#claim-pane .merge-flag-tags[data-id="' + module.claim_id + '"] a.ui.label').popup();
					$('#claim-pane .theme-tags[data-id="' + module.claim_id + '"]').html($(xhr.themes).filter('.theme-tags').html());
					// $('#claim-pane .theme-tags[data-id="' + module.claim_id + '"] div.ui.label').popup();
				} else if (module.display_type == 'overview') {
					$('#claim-pane .reword-flag-tags').each(function() {
						var version_id = this.getAttribute('data-id');
						$(this).html($(xhr[version_id].reword_flags).filter('.reword-flag-tags').html());
					});
					// $('#claim-pane .reword-flag-tags .ui.label').popup();
					$('#claim-pane .merge-flag-tags').each(function() {
						var claim_id = this.getAttribute('data-id');
						$(this).html($(xhr[claim_id].merge_flags).filter('.merge-flag-tags').html());
					});
					// $('#claim-pane .merge-flag-tags .ui.label').popup();
					$('#claim-pane .theme-tags').each(function() {
						var claim_id = this.getAttribute('data-id');
						$(this).html($(xhr[claim_id].themes).filter('.theme-tags').html());
					});
					// $('#claim-pane .theme-tags .ui.label').popup();
				}
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}

	function loadVotes() {
		var _this = this;
		$('.claim.menu .claim-vote-btn').addClass('unready');
		_this.voteLoader = $.ajax({
			url: '/api_claim_vote/',
			type: 'post',
			data: {
				action: _this.display_type == 'fullscreen' ? 'load_single' : 'load_all',
				claim_id: _this.claim_id,
			},
			success: function(xhr) {
				if (_this.display_type == 'fullscreen') {
					_updateVotingMenu($('#claim-pane .claim.menu'), xhr['voters']);
				} else if (_this.display_type == 'overview') {
					$('#claim-pane .claim.menu').each(function() {
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
	};

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
	};

	module.updateNavigator = function() {
		var _this = this;
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
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	};

	return module;
});