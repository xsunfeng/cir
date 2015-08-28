define([

], function() {
	var module = {};
	module.initLayout = function() {
		$('.tabular.menu > .container > .item').tab();
	};

	module.initLayout();
	return module;
});
