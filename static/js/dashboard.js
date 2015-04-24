(function($) {
	$(document).ready(function() {
		CirDashboard.initLayout();
	});
})(jQuery);

var CirLayout = {
	initLayout: function() {
		$('.tabular.menu > .container > .item').tab();
		// TODO
	},
}