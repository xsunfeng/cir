define([
	'jquery',
	'facilitation/doc-manager',
	'semantic-ui'
], function(
	$,
	DocManager
) {
	var module = {};
	module.initLayout = function() {
		$('#nav-menu > .item').tab();
		$('#nav-menu > .item[data-tab="document-tab"]').tab({
			'onFirstLoad': function() {
				DocManager.init();
			}
		});
	};

	module.initLayout();
	return module;
});
