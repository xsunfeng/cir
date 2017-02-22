define([
	'jquery',
	'utils',
	'claim-common/draft-stmt',
	'realtime/socket',
], function(
	$,
	Utils,
	DraftStmt,
	Socket
) {
	jQuery.fn.feed = function(action, data, callback) {
		var _this = this;
		this.update = function(callback) {

			// $('.feed-adopt-claim-version').hover(
			// 	function() {
			// 		$(this).text( "retract" );
			// 	}, function() {
			// 		$(this).text( "adopted" );
			// 	}
			// );

			if (_this.updater) {
				_this.updater.abort();
			}
			if (this.data('type') == 'highlight') { // load activity feed on a highlight
				this.data('highlight_id', this.data('id'));
				var url = '/api_annotation/';
			} else if (this.data('type') == 'claim') {
				this.data('slot_id', this.data('id'));
				var url = '/api_claim_activities/';
			} else if (this.data('type') == 'question') {
				this.data('question_id', this.data('id'));
				var url = '/api_qa/';
			} else if (this.data('type') == 'post') { // only show subset of activities
				this.data('root_id', this.data('id'));
				var url = '/api_claim_activities/';
			}
			if (!require.defined('phase1/layout') && !require.defined('phase2/layout') && !require.defined('phase3/claim') && !require.defined('phase4/claim')) {
				return;
			}
			var claimModule;
			if (require.defined('phase1/layout')) {
				claimModule = require.defined('phase1/layout');
			} else if (require.defined('phase2/layout')) {
				claimModule = require.defined('phase2/layout');
			} else if (require.defined('phase3/claim')) {
				claimModule = require.defined('phase3/claim');
			} else if (require.defined('phase4/claim')) {
				claimModule = require.defined('phase4/claim');
			}
			_this.updater = $.ajax({
				url: url,
				type: 'post',
				data: $.extend({}, {
					action: 'load-thread'
				}, _this.data()),
				success: function(xhr) {
					_this.html(xhr.html);

					showDeleteButtons();

					if (_this.data('type') == 'claim' && claimModule && claimModule.display_type == 'fullscreen') {
						_this.find('.filter.buttons .button').removeClass('loading').removeClass('active');
						_this.find('.filter.buttons .button[data-filter="' + _this.data('filter') + '"]').addClass('active');

						loadAlternativeVersions();
					}
					// init UI elements
					_this.find('.ui.checkbox').checkbox();
					if (sessionStorage['simulated_user_role'] && sessionStorage['simulated_user_role'] == 'facilitator' || (!sessionStorage['simulated_user_role']) && sessionStorage['role'] == 'facilitator') {
						_this.find('.facilitator-only').show();
					}
					if (typeof callback == 'function') callback();


					$(".activity-filter a").removeClass("active");
					var activity_filter = sessionStorage.getItem("activity-filter");
					$("." + activity_filter).click();

					$('textarea').each(function () {
						this.setAttribute('style', 'height:' + (this.scrollHeight) + 'px; overflow-y:hidden; width:100%!important;');
					}).on('input', function () {
						this.style.height = 'auto';
						this.style.height = (this.scrollHeight) + 'px';
					});

				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				},
			});
			return _this.updater;
		};

		function updateVotingMenu($menu, vote_data) {
			$menu.find('.feed-like-claim-version').each(function() {
				var vote_type = this.getAttribute('data-action');
				var voter_names = vote_data[vote_type];
				var my_votes = vote_data['my_votes'] ? vote_data['my_votes'] : '';
				var i_voted = my_votes.indexOf(vote_type) > -1;
				var voter_cnt = voter_names.length; // doesn't include myself
				if (voter_cnt == 0 && !i_voted) { // nobody voted at all
					$(this).removeClass('active');
					if (vote_type == 'like') {
						var title = 'Like this version';
					}
				} else {
					if (i_voted) {
						voter_cnt++;
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
		}

		function showDeleteButtons() {
			var $events = _this.find('.event');
			$events.each(function(ind, el) {
				if (sessionStorage.simulated_user_id) {
					if ($(el).find('.user').attr('data-id') == sessionStorage.simulated_user_id) {
						$(el).find('.feed-delete-entry').show();
					}
				} else {
					if ($(el).find('.user').attr('data-id') == sessionStorage.user_id) {
						$(el).find('.feed-delete-entry').show();
					}
				}
			});
		}
		function loadAlternativeVersions() {
			// load votes on alternative versions
			$('#claim-activity-feed .improve.menu').each(function() {
				var $menu = $(this);
				// prevent users' fast view switching!
				var claimModule = require.defined('phase3/claim') ? require('phase3/claim') : require('phase4/claim');
				if (claimModule.display_type != 'fullscreen') return;
				var version_id = this.getAttribute('data-id');
				$.ajax({
					url: '/api_claim_vote/',
					type: 'post',
					data: {
						action: 'load version', // not expecting too many of them
						version_id: version_id,
					},
					success: function(xhr) {
						updateVotingMenu($menu, xhr.voters);
					},
					error: function(xhr) {
						if (xhr.status == 403) {
							Utils.notify('error', xhr.responseText);
						}
					}
				});
			});
		}
		function deleteEntry(entry_id) {
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
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}

		function submitComment(content, type) {
			if ($.trim(content).length == 0) {
				Utils.notify('error', 'Content must not be empty.');
				return;
			}
			var $form = $('#activity-' + type + '-form');
			$form.find('.button').addClass('loading');

			var data = $.extend({
				action: 'create',
				content: content
			}, _this.data());

			if (_this.data('type') == 'question' || type == 'reply') {
				// in QA panel, when you don't specify a reply target, it means the question by default.
				data.reply_id = $form.find('span').attr('data-reply-id');
				data.reply_type = 'entry';
				if (typeof data.reply_id == 'undefined') {
					data.reply_id = _this.data('question_id');
				}
				if ($form.find('.request-action.checkbox').length) {
					data.request_action = $form.find('.request-action.checkbox').checkbox('is checked');
				}
			} else if (type == 'comment') {
				// in document/claim thread, you always need to specify a target
				data.reply_id = $form.find('span').attr('data-reply-id');
				data.reply_type = $form.find('span').attr('data-reply-type');
				if ($form.find('.collective.checkbox').length) {
					data.collective = $form.find('.collective.checkbox').checkbox('is checked');
				}
				if ($form.find('.request-action.checkbox').length) {
					data.request_action = $form.find('.request-action.checkbox').checkbox('is checked');
				}
			}
			$.ajax({
				url: '/api_annotation/',
				type: 'post',
				data: data,
				success: function() {
					_this.update();
					$form.find('textarea').val('');
					if (type == 'reply') {
						$form.hide();
					}
					$form.find('span').removeAttr('data-reply-id').removeAttr('data-reply-type');
					$form.find('.button').removeClass('loading');
					if (_this.data('type') == 'question') {
						// activities on QA panel -- dispatch the event
						require('realtime/socket').dispatchNewPost({
							'target': _this.data('question_id')
						});
					}
					if (data.request_action) {
						// TODO realtime notify others
					}
				},
				error: function(xhr) {
					$form.find('.button').removeClass('loading');
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				},
				complete: function() {
					_this.find('.collective-wrapper').checkbox('uncheck');
				}
			});
		}
		function likeClaimVersion(button) {
			var _that = button;
			var $menu = $(button).parent().parent();
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
					updateVotingMenu($menu, xhr.voters);
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}
		function adoptClaimVersion(button) {
			var $menu = $(button).parent().parent();
			var id = $menu.attr('data-id');
			var action = button.getAttribute('data-action');
			var $container = $(button).closest(".event");
			$.ajax({
				url: '/api_claim_vote/',
				type: 'post',
				data: {
					action: action,
					version_id: id,
				},
				success: function(xhr) {
					// _this.update();
					if (action == 'adopt') {
						$container.find(".feed-adopt-claim-version").attr("data-action", "deadopt");
						$container.find(".feed-adopt-claim-version span").text("Adopted");
						// DraftStmt.update();
					} else {
						$container.find(".feed-adopt-claim-version").attr("data-action", "adopt");
						$container.find(".feed-adopt-claim-version span").text("Adopt");
						// $('#draft-stmt .src_claim[data-id="' + id + '"]').remove();
					}
					var slot_id = $(".slot").attr("data-id");
					$(".show-workspace[slot-id=" + slot_id + "]").click();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}
		if (action == 'init') {
			// listeners
			this.on('click', '.feed-reply-entry, .feed-reply-event', function(e) {
				e.preventDefault();
				var name = $(this).parents('.event').find('.user:eq(0)').text();
				var entry_id = this.getAttribute('data-id');
				if ($(this).hasClass('feed-reply-entry')) {
					$('#activity-reply-form span')
						.attr('data-reply-id', entry_id)
						.attr('data-reply-type', 'entry')
						.text('Reply to ' + name);
				} else if ($(this).hasClass('feed-reply-event')) {
					$('#activity-reply-form span')
						.attr('data-reply-id', entry_id)
						.attr('data-reply-type', 'event')
						.text('Reply to ' + name);
				}
				$('#activity-reply-form').insertAfter($(this).parent().parent()).show();
				$('#activity-reply-form textarea').focus();
			}).on('click', '.feed-delete-entry', function() {
				var entry_id = this.getAttribute('data-id');
				deleteEntry(entry_id);
			}).on('click', '.feed-like-claim-version', function(e) {
				likeClaimVersion(this);

			}).on('click', '.feed-edit-claim', function(e) {
				$(this).parents('.event').find(".edited").hide();
				$(this).parents('.event').find(".editing").show();
				$('textarea').each(function () {
					this.setAttribute('style', 'height:' + (this.scrollHeight) + 'px;overflow-y:hidden; width:100%!important;');
				}).on('input', function () {
					this.style.height = 'auto';
					this.style.height = (this.scrollHeight) + 'px';
				});
			}).on('click', '.feed-edit-claim-cancel', function(e) {
				$(this).parents('.event').find(".editing").hide();
				$(this).parents('.event').find(".edited").show();
				$container = $(this).parents('.event');
				var content = $container.find(".improved.text .content").text();
				$container.find("textarea").val(content);
			}).on('click', '.feed-edit-claim-save', function(e) {
				$container = $(this).parents('.event');
				var content = $container.find("textarea").val();
				var claim_version_id = $container.attr("data-id");
				$container.find(".improved.text .content").text(content);
				$container.find("textarea").val(content);
				$(this).parents('.event').find(".editing").hide();
				$(this).parents('.event').find(".edited").show();
				$.ajax({
					url: '/api_claim/',
					type: 'post',
					data: {
						action: 'update',
						content: content,
						claim_version_id: claim_version_id,
					},
					success: function(xhr) {
					},
					error: function(xhr) {
						if (xhr.status == 403) {
							Utils.notify('error', xhr.responseText);
						}
					}
				});
			// copy and paste, edit for adopted statement
			}).on('click', '.feed-diff-claim-version', function() {
				var $current_text = $(this).parents('.event').find('.improved.text');
				var text = $current_text.text();
				if ($(this).text() == 'Show difference') {
					_this.tempOrigText = text;
					var adopted_text = $('#claim-pane .claim-content').text();
					var diff = require('utils').StringDiff.diffString(adopted_text, text);
					$current_text.html(diff);
					$(this).text('Hide difference');
				} else {
					$current_text.text(_this.tempOrigText);
					delete _this.tempOrigText;
					$(this).text('Show difference');
				}
			}).on('click', '.feed-adopt-claim-version', function() {
				adoptClaimVersion(this);
			}).on('click', '#activity-comment-form div.submit', function(e) {
				var $form = $(this).parents('form');
				var content = $form.find('textarea').val();
				submitComment(content, 'comment');
				$(".activity-filter .statement-comment").click();
			}).on('click', '#activity-reply-form div.submit', function(e) {
				var $form = $(this).parents('form');
				var content = $form.find('textarea').val();
				submitComment(content, 'reply');
			}).on('keydown', 'textarea', function(e) {
				if ((e.ctrlKey || e.metaKey) && e.keyCode == 13) {
					$(this).parent().next().trigger('click');
				}
			});

		} else if (action == 'update') {
			if (typeof data == 'object') {
				this.data(data);
			}
			return this.update(callback);
		} else if (action == 'get_id') {
			return _this.data('id');
		}
		return this;
	}
});
