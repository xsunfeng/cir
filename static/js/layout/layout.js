define([
	'document',
	'claim',
	'claim-navigator',
	'workbench',
	'semantic-ui'
], function(
	DocumentView,
	ClaimView,
	ClaimNavigator,
	WorkbenchView
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
		$('#nav-menu > .item').tab();
		$('.ui.instructions.accordion').accordion();
		DocumentView.initDocumentView();
		ClaimView.initClaimView();
		WorkbenchView.initWorkbenchView();
	}
	initLayout();
	DocumentView.updateCategories();
	ClaimView.updateClaimPane();
	ClaimNavigator.updateNavigator();
	return module;
});

