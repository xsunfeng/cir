define([
	'jquery',
	'utils',
	'claim-common/draft-stmt',
	'realtime/socket',
	'feed/activity-feed',
	'semantic-ui'
], function(
	$,
	Utils,
	DraftStmt,
	Socket
) {
	var module = {};
	module.initClaimView = function() {
		// static event listeners
		$('#claim-pane-fullscreen').on('click', '.claim-reword-btn', function() {
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
					slot_id: module.slot_id,
					collective: collective
				},
				success: function(xhr) {
					if (collective == 'true') {
						// the new version is adopted!
						module.updateClaimPane();
					} else {
						$('#claim-activity-feed').feed('update', {
							'type': 'claim',
							'id': module.slot_id,
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
		}).on('click', '.feed-reword-claim', function() {
			$('#claim-pane .reword.form input[name="collective"]').val('true');
			$('#claim-pane .claim.reword.editor')
				.val($.trim($('#claim-pane .claim-content').text()));
			$('#claim-pane .reword.form').transition('slide down', '500ms');
		});
	};


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
			},
			error: function(xhr) {
				$('#claim-pane-fullscreen').html('');
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
		return module.claimLoader;
	};


	DraftStmt.activeClaimModule = module;
	Socket.activeClaimModule = module;
	DraftStmt.update();
	module.initClaimView();
	return module;
});