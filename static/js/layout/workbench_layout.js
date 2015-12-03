define([
	'workbench2',
	'semantic-ui',
], function(
	WorkbenchView
) {
	var module = {

	};
	function initLayout() {
		$('#nav-menu > .item').tab();
		WorkbenchView.initWorkbenchView();
	}
	initLayout();
	return module;
});

