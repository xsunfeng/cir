define([

	'jquery',
	'semantic-ui'
], function(
	$
) {
	var module = {

	};
	function initLayout() {

		$('.ui.accordion').accordion();
		$('#opinion-textarea').trumbowyg({
			btns: [
				['viewHTML'],
				'btnGrp-semantic',
				['link'],
				['insertImage'],
				'btnGrp-lists',
				['removeformat'],
				['fullscreen']
			],
			autogrow: true,
			semantic: false,
			removeformatPasted: true,
		});

	}

	initLayout();
	return module;
});

