define([
	'jquery',
	'utils'
], function(
	$,
	Utils
) {
	var module = {};
	module.$el = $('.main.tab[data-tab="overview-tab"]');
	module.init = function() {
		module.$el.find('.phase.update.button').on('click', function() {
			var selected = module.$el.find('.phase.dropdown').val();
			$.ajax({
				url: '/dashboard/phase/',
				type: 'post',
				data: {
					'action': 'change-phase',
					'phase': selected
				},
				success: function(xhr) {
					Utils.notify('success', 'Phase changed.');
					require('realtime/socket').updatePhase({
						phase: module.$el.find('.phase.dropdown option:selected').val(),
						forum_id: $('body').attr('forum-id'),
						phaseFullname: module.$el.find('.phase.dropdown option:selected').text()
					});
				}
			})
		});
	};
	return module;
});