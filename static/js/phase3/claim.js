define([
	'jquery',
	'claim-common/draft-stmt',
	'realtime/socket',
	'doc/qa',
	'utils',
	'feed/activity-feed',
	'semantic-ui',
], function(
	$,
	DraftStmt,
	Socket,
	QA,
	Utils
) {
	var module = {};
	module.initClaimView = function() {
		$('#claim-pane-overview').on("click", ".toslot", function(){
			var $slot = $(".phase3.item.slot[data-id=" + $(this).attr("data-slot-id") + "]");
			if (!$slot) return;
			$slot.find(".segment").addClass("highlight-found");
			$("#draft-stmt-container").scrollTop($slot.position().top - 30);
			setTimeout(function() {
				$slot.find(".segment").removeClass('highlight-found');
			}, 1000);
		}).on('click', '.show-doc-panel', function(e) {
			var claim_id = $(this).parents('.claim.segment').attr('data-id');
			$('#doc-context-panel')
                .css('left', e.clientX)
                .css('top', e.clientY)
				.show()
				.find('.doc-content')
				.addClass('loading');
			$.ajax({
                url: '/api_doc/',
                type: 'post',
                data: {
                    'action': 'get-section-by-nugget',
                    'nugget_id': claim_id
                },
				success: function(xhr) {
                	var $context = $('#doc-context-panel .doc-content');
                    $context
						.html(xhr.html)
						.removeClass('loading');
                    for (var j = 0; j < xhr.highlights.length; j++) {
                        var highlight = xhr.highlights[j];
                        for (var i = highlight.start; i <= highlight.end; i++) {
                            var $token = $context.find('.tk[data-id="' + i + '"]');
                            if (typeof $token.attr('data-hl-id') == 'undefined') { // new highlight for this word
                                $token.addClass('c').attr('data-hl-id', highlight.id);
                            } else {
                                var curr_id = $token.attr('data-hl-id'); // append highlight for this word
                                $token.addClass('c').attr('data-hl-id', curr_id + ' ' + highlight.id);
                            }
                        }
                    }
                    // jump to highlight
                    var $target = $('u.tk[data-hl-id*="' + xhr.highlight_id + '"]');
                    if ($target.length > 0) {
                        var elOffset = $target.position().top;
                        var windowHeight = $context.height();
                        $context.scrollTop(elOffset - (windowHeight / 2));
                        $target.addClass('highlight-found');
                        setTimeout(function() {
                            $target.removeClass('highlight-found');
                        }, 2000);
                    }
                }
			});
		});

		$('#doc-context-panel').on('click', '.close.button', function() {
			$('#doc-context-panel').removeAttr('style');
		});
	};

	module.updateClaimPane = function() {
		if (module.claimLoader) {
			module.claimLoader.abort();
		}
		$('#claim-pane-overview').html('<div class="ui active centered inline loader"></div>');

		module.claimLoader = $.ajax({
			url: '/api_get_claim/',
			type: 'post',
			data: {
				'action': 'get-claim',
				'display_type': 'overview',
				'claim_id': module.claim_id, // used only when display_type == 'fullscreen'
			},
			success: function(xhr) {
				$('#claim-pane-overview').html(xhr.html);
				$('.ui.accordion').accordion({'close nested': false});
				DraftStmt.initStmtHandles();
				if (sessionStorage['simulated_user_role'] && sessionStorage['simulated_user_role'] == 'facilitator' || (!sessionStorage['simulated_user_role']) && sessionStorage['role'] == 'facilitator') {
					$('#claim-container .facilitator-only').show();
				}
				if (DraftStmt.isLoaded) {
                    DraftStmt.update_claim_usage();
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

	module.initClaimView();
	module.updateClaimPane();

	DraftStmt.activeClaimModule = module;
	Socket.activeClaimModule = module;
	DraftStmt.update();
	QA.updateQuestionList();
	return module;
});