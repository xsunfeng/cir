(function($) {
	$(document).ready(function() {
		CirLayout.initLayout();
		window.default_doc = new CirDocument();
		default_doc.updateCategories();
		window.default_claim = new CirClaim();
		default_claim.updateClaimPane();
		default_claim.updateNavigator();
	});
})(jQuery);

var CirLayout = {
	initLayout: function() {
		$('.tabular.menu > .container > .item').tab();
	},
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
}