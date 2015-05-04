(function($) {
	$(document).ready(function() {
		CirDashboard.initLayout();
	});
})(jQuery);

var CirDashboard = {
	initLayout: function() {
		$('.tabular.menu > .container > .item').tab();
		// TODO
	},
}