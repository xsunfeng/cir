define([
	'document',
	'claim'
], function(
	DocumentView,
	ClaimView
) {
	var module = {
		changeTab: function(dest, callback) {
			if (typeof dest == 'undefined') {
				var cur_state = $('.tabular.menu > .container > .item.active').attr('data-tab');
				if (cur_state == 'claim-tab') {
					dest = 'document-tab';
				} else if (cur_state == 'document-tab') {
					dest = 'claim-tab';
				}
			}
			$('.tabular.menu > .container > .item').tab('change tab', dest);
			if (typeof callback == 'function') {
				callback();
			}
		}
	};
	function initLayout() {
		$('.tabular.menu > .container > .item').tab();
		$('.ui.instructions.accordion').accordion();
		DocumentView.initDocumentView();
		ClaimView.initClaimView();
	}
	initLayout();
	DocumentView.updateCategories();
	ClaimView.updateClaimPane();
	ClaimView.updateNavigator();
	return module;
});

