define([
	'jquery',
	'utils',
	'facilitation/theme',
	'facilitation/phase'
], function(
	$,
	Utils,
	Theme,
	Phase
) {
	var module = {};
	module.initLayout = function() {

		Theme.init();
		Phase.init();

		$("#feng-button-group").on("click", ".feng-button", function() {
			$("#feng-button-group .feng-button").removeClass("active");
			$(this).addClass("active");
			var selection = $(this).attr("data-content");
			switch(selection) {

			    case "theme":
					$.ajax({
						url: '/dashboard/theme/',
						type: 'post',
						data: {
							'action': 'get-theme',
						},
						success: function(xhr) {
							$("#feng-container").html(xhr.html);
						}
					})
			        break;

			    case "phase":
					$.ajax({
						url: '/dashboard/phase/',
						type: 'post',
						data: {
							'action': 'get-phase',
						},
						success: function(xhr) {
							$("#feng-container").html(xhr.html);
						}
					})
			        break;

			    case "document":
					$.ajax({
						url: '/dashboard/document/',
						type: 'post',
						data: {
							'action': 'get-document',
						},
						success: function(xhr) {
							$("#feng-container").html(xhr.html);
						}
					})
			        break;

			    default:
			}
		});
	};

	sessionStorage.setItem('role', 'facilitator');
	module.initLayout();
	return module;
});
