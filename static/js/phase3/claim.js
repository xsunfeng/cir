define([
	'jquery',
	'claim-common/claim-filter',
	'claim-common/draft-stmt',
	'realtime/socket',
	'doc/qa',
	'utils',
	'feed/activity-feed',
	'semantic-ui',
], function(
	$,
	ClaimFilter,
	DraftStmt,
	Socket,
	QA,
	Utils
) {
	var module = {};
	module.initClaimView = function() {
		$("body").on("click", ".toslot", function(){
			$slot = $(".phase3.item.slot[data-id=" + $(this).attr("slot-id") + "]");
			$slot.find(".segment").addClass("highlight-found");
			$("#draft-stmt-container").scrollTop($slot.position().top - 30);
			setTimeout(function() {
				$slot.find(".segment").removeClass('highlight-found');
			}, 1000);
		});

		$("body").on("click", ".statement-filter .item", function(){
			$(".statement-filter .item").removeClass("active");
			$(this).addClass("active");
			if ($(this).hasClass("categorize-tab") && $("#draft-stmt").css("display") === "none") {
				$("#draft-stmt").show();
				$("#my-statement").hide();
				$("#active-statement").hide();
			} else if ($(this).hasClass("my-statement-tab") && $("#my-statement").css("display") === "none") {
				$("#draft-stmt").hide();
				$("#my-statement").show();
				$("#active-statement").hide();
			} else if ($(this).hasClass("active-statement-tab") && $("#active-statement").css("display") === "none") {
				$("#draft-stmt").hide();
				$("#my-statement").hide();
				$("#active-statement").show();
			}
		});
	};

	$("body").on("click", ".all-activity", function(){
		$(".activity-filter a").removeClass("active");
		$(this).addClass("active");
		$(".event").show();
	}).on("click", ".statement-candidate", function(){
		$(".activity-filter a").removeClass("active");
		$(this).addClass("active");
		$(".event").each(function(){
	        if ($(this).attr("data-type") != "claim version") $(this).hide()
	    });		
	});

	$("body").on("click", ".show-workspace", function(){
		var slot_id = $(this).parents(".slot").attr("data-id");
		$.ajax({
			url: '/api_get_slot/',
			type: 'post',
			data: {
				'action': 'get-slot',
				'slot_id': slot_id, // used only when display_type == 'fullscreen'
			},
			success: function(xhr) {
				$('.slot-workspace').empty();
				$('.slot-workspace[data-id=' + slot_id + ']').html(xhr.html);
				$('.slot-workspace[data-id=' + slot_id + ']').find(".reword").show();
				// load activities
				$('#claim-activity-feed').feed('init');
				$('#claim-activity-feed').feed('update', { // async
					'type': 'claim',
					'id': slot_id,
				});
				$('.reword.form .request-action.checkbox').checkbox();
				if (sessionStorage['simulated_user_role'] && sessionStorage['simulated_user_role'] == 'facilitator' || (!sessionStorage['simulated_user_role']) && sessionStorage['role'] == 'facilitator') {
					$('.slot-workspace .facilitator-only').show();
				}
				$("#draft-stmt-container").animate({scrollTop: 0}, 0);
				var offset = $(".show-workspace[data-id=" + slot_id + "]").offset().top;
				$("#draft-stmt-container").animate({scrollTop: (offset - 100)}, 100);
			},
			error: function(xhr) {
				$('#claim-pane-fullscreen').html('');
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});		
	});

	// static event listeners
	$('body').on('click', '.claim-reword-btn', function() {
		var slot_id = $(this).parents(".slot").attr("data-id");
		$('.slot-workspace[data-id=' + slot_id + ']').find(".reword.form'").transition('slide down', '500ms');
	}).on('click', '.reword.form .submit.button', function() {
		var slot_id = $(this).parents(".slot").attr("data-id");
		var content = $('.slot-workspace[data-id=' + slot_id + ']').find(".claim.reword.editor").val();
		if ($.trim(content).length == 0) {
			Utils.notify('error', 'Content must not be empty.');
			return;
		}
		var collective = false;
		var request_action = $('.reword.form .request-action.checkbox').checkbox('is checked');
		$.ajax({
			url: '/api_claim/',
			type: 'post',
			data: {
				action: 'reword',
				content: content,
				slot_id: slot_id,
				collective: collective,
				request_action: request_action
			},
			success: function(xhr) {
				if (collective == 'true') {
					// the new version is adopted!
					$(".show-workspace[data-id=" + slot_id + "]").click();
				} else {
					$('#claim-activity-feed').feed('update', {
						'type': 'claim',
						'id': slot_id,
					});
					$('#claim-pane-fullscreen .claim.reword.editor').val('');
					$('#claim-pane-fullscreen .reword.form').transition('slide down', '500ms');
				}
				// TODO realtime notify everyone
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
	}).on('click', '.feed-reword-claim', function() {
		$('#claim-pane .reword.form input[name="collective"]').val('true');
		$('#claim-pane .claim.reword.editor')
			.val($.trim($('#claim-pane .claim-content').text()));
		$('#claim-pane .reword.form').transition('slide down', '500ms');
	});

	module.updateClaimPane = function() {
		if (module.claimLoader) {
			module.claimLoader.abort();
		}
		$('#claim-filter-pane .ui.dropdown').addClass('disabled');
		$('#claim-pane-overview').html('<div class="ui active centered inline loader"></div>');
		ClaimFilter.setActive();

		module.claimLoader = $.ajax({
			url: '/api_get_claim/',
			type: 'post',
			data: {
				'action': 'get-claim',
				'display_type': 'overview',
				'claim_id': module.claim_id, // used only when display_type == 'fullscreen'
				'category': ClaimFilter.currentCategory,
				'theme': ClaimFilter.currentTheme,
			},
			success: function(xhr) {
				$('#claim-pane-overview').html(xhr.html);
				$('.ui.accordion').accordion({'close nested': false});
				DraftStmt.initStmtHandles();
				if (sessionStorage['simulated_user_role'] && sessionStorage['simulated_user_role'] == 'facilitator' || (!sessionStorage['simulated_user_role']) && sessionStorage['role'] == 'facilitator') {
					$('#claim-container .facilitator-only').show();
				}
				$('#claim-filter-pane .ui.dropdown').removeClass('disabled');
				DraftStmt.update_claim_usage();
			},
			error: function(xhr) {
				$('#claim-pane-overview').removeClass('loading');
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
				$('#claim-filter-pane .ui.dropdown').removeClass('disabled');
			}
		});
		return module.claimLoader;
	};

	module.jumpTo = function(claim_id) {
		$('#claim-pane-overview .claim.segment .claim-content').removeClass('highlight-found');
		var $claim_wrapper = $('#claim-pane-overview .claim.segment[data-id="' + claim_id + '"]');
		if ($claim_wrapper.length) {
			$('#claim-container').scrollTop($claim_wrapper.position().top - 30);
			$claim_wrapper.addClass('highlight-found');
			setTimeout(function() {
				$claim_wrapper.removeClass('highlight-found');
			}, 1000);
		}
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
	}

	module.initClaimView();
	module.updateClaimPane();

	ClaimFilter.activeClaimModule = module;
	DraftStmt.activeClaimModule = module;
	Socket.activeClaimModule = module;
	DraftStmt.update();
	QA.updateQuestionList();
	ClaimFilter.updateNavigator({'filter': true});
	return module;
});