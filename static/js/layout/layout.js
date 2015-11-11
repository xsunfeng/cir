define([
	'document',
	'claim',
	'claim-navigator',
	'draft-stmt',
	'semantic-ui',
	'realtime/socket'
], function(
	DocumentView,
	ClaimView,
	ClaimNavigator,
	DraftStmt
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
		DocumentView.initDocumentView();
		ClaimView.initClaimView();
	}
	initLayout();
	DocumentView.updateCategories();
	ClaimView.updateClaimPane();
	if (module.phase == 'improve') {
		DraftStmt.update();
	} else{
		ClaimNavigator.updateNavigator();
	}
	return module;
});

