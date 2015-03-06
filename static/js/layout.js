(function($) {
	$(document).ready(function() {
		CirLayout.initLayout();
		var default_doc = new CirDocument();
		default_doc.updateCategories();
	});
})(jQuery);

var CirLayout = {
	initLayout: function() {
		$('.tabular.menu > .container > .item').tab();
	},
}