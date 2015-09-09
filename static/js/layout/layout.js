define([
	'document',
	'claim',
	'tag'
], function(
	DocumentView,
	ClaimView,
	TagView
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
		TagView.initTagView();
	}
	initLayout();
	TagView.updateCategories();
	DocumentView.updateCategories();
	ClaimView.updateClaimPane();
	ClaimView.updateNavigator();
	return module;
});

