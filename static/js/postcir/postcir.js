define([

	'jquery',
	'semantic-ui',
    'tinymce'
], function(
	$
) {
	var module = {

	};
	function initLayout() {

		$('.ui.accordion').accordion();
        tinymce.init({
            selector: '#opinion-textarea',
            max_height: 600,
            autoresize_max_height: 400,
            autoresize_bottom_margin: 0,
            menubar: false,
            min_height: 100,
            plugins: 'autoresize paste code autolink link image noneditable',
            noneditable_noneditable_class: 'cite-label',
            browser_spellcheck: true,
            statusbar: false,
            paste_as_text: true,
            toolbar: 'undo redo | bold italic | bullist numlist | link image | code',
            content_css: '/static/css/postcir_editor.css',
            setup: function(editor) {
                editor.on('click', function(e) {
                    var $target = $(e.target);
                    if ($target.hasClass('cite-label')) {

                    }
                });
            }
        });


        module.newHighlight = {};
        module.isDragging = false;
        module.draggingTarget = null;
        $('#citizens-statement').on('click', '.tk', function (e) {
            e.stopPropagation();
            if ($(this).hasClass('r')) {
                var highlight_ids = this.getAttribute('data-hl-id').split(' ');
                for (var i = 0; i < highlight_ids.length; i++) {
                    // this highlighted text is referenced -- don't do anything TODO
                }
            }
        }).on('mousedown', '.stmt.segment', function (e) {
            $('#stmt-highlight-toolbar').removeAttr('style');
            if ($(e.target).is('u.tk')) {
                module.draggingTarget = $(e.target.parentElement);
                module.draggingTarget.mousemove(function(e2) {
                    module.isDragging = true;
                    module.newHighlight.end = e2.target.getAttribute('data-id');
                    var min = Math.min(module.newHighlight.start, module.newHighlight.end);
                    var max = Math.max(module.newHighlight.start, module.newHighlight.end);
                    $('#citizens-statement .tk.highlighted').removeClass('highlighted');
                    for (var i = min; i <= max; i++) {
                        module.draggingTarget.find('.tk[data-id="' + i + '"]').addClass('highlighted');
                    }
                    module.newHighlight.contextId = module.draggingTarget.attr('data-id');
                });
                module.newHighlight.start = e.target.getAttribute('data-id');
                module.newHighlight.end = e.target.getAttribute('data-id');
            }
        }).on('mouseup', '.stmt.segment', function (e) {
            module.draggingTarget.off('mousemove');
            var wasDragging = module.isDragging;
            module.isDragging = false;
            if (wasDragging) {
                var min = Math.min(module.newHighlight.start, module.newHighlight.end);
                var max = Math.max(module.newHighlight.start, module.newHighlight.end);
                module.newHighlight.start = min;
                module.newHighlight.end = max;


                if ($(this).find('.tk.highlighted').length) {
                    var highlights = $(this).find('.tk.highlighted');
                    var text = "";
                    for (var i = 0; i < highlights.length; i++) {
                        text += highlights[i].textContent;
                    }
                    module.newHighlight.text = text;
                    module.newHighlight.cite_name = $(highlights[0]).parents('li').attr('cite-name');
                    $('#stmt-highlight-toolbar').css('left', e.pageX - 14).css('top', e.pageY + $('#citizens-statement').scrollTop() - 50);
                }
            } else { // just clicking
                $('#stmt-highlight-toolbar').removeAttr('style');
                $(this).find('.tk').removeClass('highlighted');
                module.newHighlight = {};
            }
        });

        $('#stmt-highlight-toolbar .stmt-cite-btn').click(function() {
            var citeHtml = '<span class="cite-label" claim-id="'
                + module.newHighlight.contextId
                + '" start="'
                + module.newHighlight.start
                + '" end="'
                + module.newHighlight.end
                + '">'
                + module.newHighlight.cite_name
                + '</span>';
            tinymce.activeEditor.insertContent(citeHtml);
            $('#stmt-highlight-toolbar').removeAttr('style');

        });

        $('#post-btn').click(function() {

        });


	}

	initLayout();
	return module;
});

