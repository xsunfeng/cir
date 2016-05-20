define([
	'jquery',
	'claim-common/claim-filter',
	'claim-common/draft-stmt',
	'utils',
	'semantic-ui',
	'realtime/socket'
], function(
	$,
	ClaimFilter,
	DraftStmt,
	Utils
) {
	var module = {};
	module.initClaimView = function() {

	};

	module.updateClaimPane = function() {
		if (module.claimLoader) {
			module.claimLoader.abort();
		}
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
			},
			error: function(xhr) {
				$('#claim-pane-overview').removeClass('loading');
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
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
	DraftStmt.update();
	ClaimFilter.updateNavigator({'filter': true});
	return module;
});