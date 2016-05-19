define([
	'jquery',
	'utils',
	'claim-common/draft-stmt',
	'feed/activity-feed',
	'semantic-ui'
], function(
	$,
	Utils,
	DraftStmt
) {
	var module = {};
	module.initClaimView = function() {
		// static event listeners
		$('#claim-pane-fullscreen').on('click', '.claim-vote-btn:not(.disabled):not(.unready)', function() {
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
		}).on('click', '.claim-reword-btn', function() {
			$('#claim-pane-fullscreen .reword.form input[name="collective"]').val('false');
			$('#claim-pane-fullscreen .claim.reword.editor')
				.val($.trim($('#claim-pane .claim-content').text()));
			$('#claim-pane-fullscreen .reword.form').transition('slide down', '500ms');
		}).on('click', '.reword.form .submit.button', function() {
			var content = $('#claim-pane-fullscreen .claim.reword.editor').val();
			if ($.trim(content).length == 0) {
				Utils.notify('error', 'Content must not be empty.');
				return;
			}
			var collective = $('#claim-pane-fullscreen .reword.form input[name="collective"]').val();
			$.ajax({
				url: '/api_claim/',
				type: 'post',
				data: {
					action: 'reword',
					content: content,
					claim_id: module.claim_id,
					collective: collective
				},
				success: function(xhr) {
					if (collective == 'true') {
						// the new version is adopted!
						module.updateClaimPane();
					} else {
						$('#claim-activity-feed').feed('update', {
							'type': 'claim',
							'id': module.claim_id,
						});
						$('#claim-pane-fullscreen .claim.reword.editor').val('');
						$('#claim-pane-fullscreen .reword.form').transition('slide down', '500ms');
					}
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}).on('click', '.reword.form .reset.button', function() {
			$('#claim-pane-fullscreen .claim.reword.editor').val('');
			$('#claim-pane-fullscreen .reword.form').transition('slide down', '500ms');
		}).on('click', '.claim-merge-btn', function() {
			Utils.notify('warning', 'Please switch to Overview and try again.');
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

		}).on('click', '.claim-flag-reword-btn', function() {
			var version_id = $(this).parent().attr('data-id');
			$('#claim-reason-editor input[name="version_id"]').val(version_id);
			$('#claim-reason-editor input[name="collective"]').val(this.getAttribute('data-collective'));
			$('#claim-reason-editor').modal('show');
		}).on('click', '.claim-flag-merge-btn', function() {
			if (module.display_type != 'overview') {
				Utils.notify('warning', 'Please switch to Overview and try again.');
				return;
			}
			var $segment = $(this).parents('.claim.segment');
			$segment.find('.merge.corner.label').show();
			$('#claim-pane-overview .filter.segment').hide();
			$('#claim-pane-overview .merging.menu').show();
			$('#claim-pane-overview .merging.menu .merge.count').text($('#claim-pane-overview .merge.corner.label:visible').length);
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
				if (module.display_type == 'fullscreen') {
					$('#claim-activity-feed').feed('update');
				}
				$('#claim-pane .theme-tags[data-id="' + claim_id + '"]').html($(xhr.html).filter('.theme-tags').html());
				// $('#claim-pane .theme-tags[data-id="' + claim_id + '"] div.ui.label').popup();
			});
		}).on('click', '.theme-suggest-btn', function() {

		}).on('click', '.claim-back-to-list-btn', function() {
			var id = $(this).parents('.claim.menu').attr('data-id');
			module.jumpTo(id, 'overview');
		}).on('click', '.claim-edit-btn', function() {
			// only for unpublished claims
			// just enter fullscreen
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
				var content = $('#claim-pane-fullscreen textarea.claim.editor').val();
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
						$('#claim-pane-fullscreen .claim.segment[data-id="' + id + '"]').remove();
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
		}).on('click', '.reword-flag-tags .delete.icon', function() {
			var version_id = $(this).parents('.reword-flag-tags').attr('data-id');
			flag({
				version_id: version_id,
				action: 'flag',
				flag_type: 'reword',
				deflag: true
			}, function(xhr) {
				if (module.display_type == 'fullscreen') {
					$('#claim-activity-feed').feed('update');
				}
				$('#claim-container .reword-flag-tags[data-id="' + version_id + '"]').html($(xhr.html).filter('.reword-flag-tags').html());
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
				if (module.display_type == 'fullscreen') {
					$('#claim-activity-feed').feed('update', {
						'type': 'claim',
						'id': module.claim_id,
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
				if (module.display_type == 'fullscreen') {
					$('#claim-activity-feed').feed('update');
				}
				$('#claim-container .theme-tags[data-id="' + claim_id + '"]').html($(xhr.html).filter('.theme-tags').html());
				// $('#claim-pane .theme-tags[data-id="' + claim_id + '"] div.ui.label').popup();
			});
		}).on('click', '.merge.corner.label', function() {
			$(this).removeClass('visible').hide();
			$('#claim-pane-overview .merging.menu .merge.count').text($('#claim-pane-overview .merge.corner.label:visible').length);
			if ($('#claim-pane-overview .merge.corner.label:visible').length == 0) {
				$('#claim-pane-overview .filter.segment').show();
				$('#claim-pane-overview .merging.menu').hide();
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
					$('#claim-pane .merging.menu').hide();
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
			$('#claim-pane .merging.menu').hide();
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

		$('#claim-pane-overview').on('click', '.claim-fullscreen-btn', function() {
			module.claim_id = $(this).parents('.claim.menu').attr('data-id');
			_setDisplayType('fullscreen');
			module.updateClaimPane();
		})
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
				if (module.display_type == 'fullscreen') {
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
					ClaimNavigator.updateNavigator({'claim_only': true});
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


		// dynamic event listeners
		$('.claim-view-btn').click(function() {
			var type = this.getAttribute('data-tab');
			if (module.display_type != type) {
				_setDisplayType(type);
				module.updateClaimPane();
			}
		});
	};

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

	// kept only for compatibility with phase3/claim.js
	module.jumpTo = function(claim_id) {

	};
	module.updateClaimPane = function() {
		if (module.claimLoader) {
			module.claimLoader.abort();
		}

		module.claimLoader = $.ajax({
			url: '/api_get_slot/',
			type: 'post',
			data: {
				'action': 'get-slot',
				'slot_id': module.slot_id, // used only when display_type == 'fullscreen'
			},
			success: function(xhr) {
				$('#claim-pane-fullscreen').html(xhr.html);
				// load activities
				$('#claim-activity-feed').feed('init');
				$('#claim-activity-feed').feed('update', { // async
					'type': 'claim',
					'id': module.slot_id,
				});
				if (sessionStorage['simulated_user_role'] && sessionStorage['simulated_user_role'] == 'facilitator' || (!sessionStorage['simulated_user_role']) && sessionStorage['role'] == 'facilitator') {
					$('#claim-pane-fullscreen .facilitator-only').show();
				}
				if ($('#claim-pane-fullscreen .claim.segment').length) { // make sure non-empty claim list
					loadFlags();
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

	function initStmtHandles() {
		$('#claim-pane-overview .claim-addstmt-handle').mousedown(function(event) {
			var $claimsegment = $(this).parents('.claim.segment');
			var claimcontent = $claimsegment.find('.claim-content').text();
			DraftStmt.draggingClaimId = $claimsegment.attr('data-id');
			var $helper = $('<div id="claim-stmt-helper" class="ui segment">' + claimcontent + '</div>');
			$('body').addClass('noselect');

			// place helper
			$helper
				.css('left', event.clientX)
				.css('top', event.clientY)
				.appendTo($('body'));

			// hide invalid categories
			var category = $claimsegment.find('.category.label').text();
			$('#draft-stmt ol.list').addClass('invalid');
			if (category == 'Key Finding') {
				$('#draft-stmt ol.finding.list').removeClass('invalid');
			} else if (category == 'Pro') {
				$('#draft-stmt ol.pro.list').removeClass('invalid');
			} else if (category == 'Con') {
				$('#draft-stmt ol.con.list').removeClass('invalid');
			}

			// register mousemove & mouseup
			$(window)
				.mousemove(DraftStmt.onDrag)
				.mouseup(DraftStmt.onDragStop);
		});
	}


	DraftStmt.activeClaimModule = module;
	DraftStmt.update();
	module.initClaimView();
	return module;
});