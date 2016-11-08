define([
	'jquery',
	'claim-common/claim-filter',
	'claim-common/draft-stmt',
	'realtime/socket',
	'doc/qa',
	'utils',
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

	};

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
				_update_claim_list();
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

	function _update_claim_list() {
		var claim_to_slot_hash = {};
		var slot_types = ["finding", "pro", "con"];
		for (var i in slot_types) {
			var slot_type = slot_types[i];
			for (var i = 0; i < $('.list[data-list-type="'+ slot_type +'"] .item.slot').length; i++) {
				var slot = $('.list[data-list-type="'+ slot_type +'"] .item.slot')[i];
				var slot_id = i + 1;
				for (var j = 0; j < $(slot).find(".src_claim").length; j++) {
					var claim = $(slot).find(".src_claim")[j];
					var claim_id = $(claim).attr("data-id");
					if (claim_to_slot_hash[claim_id] === undefined) claim_to_slot_hash[claim_id] = [];
					claim_to_slot_hash[claim_id].push(slot_type + slot_id);
				}
			}
		}
		for (var i = 0; i < $(".claim.stmt").length; i++) {
			var claim = $(".claim.stmt")[i];
			$(claim).find(".slot-assignment").empty();
			var claim_id = $(claim).attr("data-id");
			if (claim_id in claim_to_slot_hash) {
				var html = '<i class="warning sign icon"></i>This claim has been categorized into: ';
				for (var j = 0; j < claim_to_slot_hash[claim_id].length; j++){
					html += claim_to_slot_hash[claim_id][j];
					if (j != claim_to_slot_hash[claim_id].length - 1) html += ", ";
				}	
				$(claim).find(".slot-assignment").append(html);				
			}
		}
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