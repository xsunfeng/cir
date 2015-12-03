define([
	'doc/document',
	'workbench2',
	'claim/claim',
	'claim/claim-navigator',
	'claim/draft-stmt',
	'doc/qa',
	'vis/activity',
	'semantic-ui',
	'realtime/socket'
], function(
	DocumentView,
	WorkbenchView,
	ClaimView,
	ClaimNavigator,
	DraftStmt,
	QAView,
	VisActivity
) {
	var module = {
		changeTab: function(dest, callback) {
			if (typeof dest == 'undefined') {
				var cur_state = $('#nav-menu > .item.active').attr('data-tab');
				if (cur_state == 'claim-tab') {
					dest = 'document-tab';
				} else if (cur_state == 'document-tab') {
					dest = 'claim-tab';
				}
			}
			$('#nav-menu > .item').tab('change tab', dest);
			if (typeof callback == 'function') {
				callback();
			}
		}
	};
	function initLayout() {
		module.phase = $('body').attr('data-phase');
		$('#nav-menu > .item').tab();	
		
		$('.ui.instructions.accordion').accordion();
		
		$("body").on("click", "#question_sidebox_tab", function(e) {
			if ($(this).attr("status") == "close") {
				$('#question_sidebox_container').animate({'right':0});
				$('#question_sidebox_tab').animate({'right':$('#question_sidebox_container').width() - 45});
				$(this).attr("status", "open");			
			} else if ($(this).attr("status") == "open") {
				$('#question_sidebox_container').animate({'right':-$('#question_sidebox_container').width()});
				$('#question_sidebox_tab').animate({'right': -45});
				$(this).attr("status", "close");			
			}

		});
		
		// DocumentView.initDocumentView();
		ClaimView.initClaimView();
		VisActivity.init();
		WorkbenchView.initWorkbenchView();
	}
	
	initLayout();
	// DocumentView.updateCategories();
	QAView.updateQuestionList();
	ClaimView.updateClaimPane();
	if (module.phase == 'improve') {
		DraftStmt.update();
} else{
		ClaimNavigator.updateNavigator();
	}
	return module;
});

