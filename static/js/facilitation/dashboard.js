define([
	'jquery',
	'facilitation/phase-manager',
	'facilitation/forum-manager',
	'facilitation/doc-manager',
	'semantic-ui'
], function(
	$,
	PhaseManager,
	ForumManager,
	DocManager
) {
	var module = {};
	module.initLayout = function() {
		$('#nav-menu > .item').tab();
		PhaseManager.init(); // the first one
		$('#nav-menu > .item[data-tab="forum-tab"]').tab({
			'onFirstLoad': function() {
				ForumManager.init();
			}
		});
		$('#nav-menu > .item[data-tab="document-tab"]').tab({
			'onFirstLoad': function() {
				DocManager.init();
			}
		});

	};

	module.initLayout();
	return module;
});
