(function($) {
	$(document).ready(function() {
		CirDashboard.initLayout();
	});
})(jQuery);

var CirDashboard = {
	initLayout: function() {
		$('.tabular.menu > .container > .item').tab();
		$('#forum-phase-form .primary.button').click(function() {
			$.ajax({
				url: '/api_switch_phase/',
				data: {
					'newPhase': $('#forum-phase-form .dropdown').val()
				},
				success: function() {
					notify('success', 'Phase switched.');
				}
			})
		});
	},
}