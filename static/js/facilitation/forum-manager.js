define([
	'jquery',
	'utils',
	'semantic-ui'
], function(
	$,
	Utils
) {
	var module = {};
	module.$el = $('.main.tab[data-tab="forum-tab"]');
	module.init = function() {
		initForms();
	};
	function initForms() {
		$('#forum-option-form').form({
			fields: {
				forum_name: {
					identifier: 'forum_name',
					rules: [{
						type: 'empty',
						prompt: 'Please enter the name of the forum'
					}]
				},
				forum_url: {
					identifier: 'forum_url',
					rules: [{
						type: 'empty',
						prompt: 'Please enter the name of the forum'
					}]
				}
			},
			onSuccess: function(e) {
				e.preventDefault();
				$.ajax({
					url: '/dashboard/forum/',
					data: $.extend({
						'action': 'update-forum-info'
					}, $('#forum-option-form').form('get values')),
					type: 'post',
					success: function(xhr) {
						Utils.notify('success', 'Forum information updated.');
					}
				});
			}
		})
	}
	return module;
});