define([
	'jquery',
	'facilitation/phase-manager',
	'facilitation/forum-manager',
	'facilitation/doc-manager',
	'facilitation/vis/pie',
	'facilitation/vis/dot',
	'semantic-ui',
	'realtime/socket'
], function(
	$,
	PhaseManager,
	ForumManager,
	DocManager,
	Pie,
	Dot
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
		$('#nav-menu > .item[data-tab="vis-tab"]').tab({
			'onFirstLoad': function() {
				Pie.init();
				Dot.init();
				$("body").on("click", ".vis-btn", function() {
					$(".vis-btn").removeClass("active");
					$(this).addClass("active");
					$(".vis-container").hide();
					var type = $(this).attr("id").split("-")[0];
					var container_id = ("#" + type + "-container");
					$(container_id).show();
				})
			}
		});
	};

	sessionStorage.setItem('role', 'facilitator');
	module.initLayout();
	return module;
});
