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
		CKEDITOR.replace('stmt_preamble', {
			// allow vertical resizing
			resize_enabled: true,
			resize_dir: 'vertical',

			// transform blank lines into empty <p> tags
			fillEmptyBlocks: false,

			// don't encode chars other than & < > and &nbsp;
			entities: false,

			// knowntags except div and span with attributes (except tyle and class) will be kept
			pasteFilter: 'semantic-content',

			// toolbar
			toolbar: [
				{name: 'document', items: ['Source']},
				{name: 'basicstyles', items: ['Bold', 'Italic', 'RemoveFormat']},
				{name: 'paragraph', items: ['NumberedList', 'BulletedList']},
				{name: 'links', items: ['Link', 'Unlink']},
				{name: 'insert', items: ['Image']}
			],

		});
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
					data: $.extend({}, $('#forum-option-form').form('get values'), {
						'action': 'update-forum-info',
						'stmt_preamble': CKEDITOR.instances.stmt_preamble.getData()
					}),
					type: 'post',
					success: function(xhr) {
						Utils.notify('success', 'Forum information updated.');
					}
				});
			}
		});
	}
	return module;
});