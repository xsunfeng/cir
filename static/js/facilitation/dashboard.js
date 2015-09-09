define([
	'utils'
], function(
	Utils
	) {
	var module = {};
	module.initLayout = function() {
		$('#nav-menu > .item').tab();
		initTagThemeDragAndDrop();
	};

	$('#add-tag-theme-btn').click(function() {
		$('.add-tag-theme-modal').modal({
			closable  : false,
			onDeny    : function(){
			  window.alert('Wait not yet!');
			  return false;
			},
			approve : '.add-tag-theme-ok',
			onApprove : function() {
			  window.alert('Approved!');
			}
		}).modal('show');
	});

	$('.add-tag-theme-ok').click(function() {
		var new_theme_name = $('.new-theme-name').val();
		var new_theme_description = $('.new-theme-description').val();
		html = 	'<div class="four wide column"><div class="ui segment tag-theme-segment"><div class="tag-theme-name"><h4>' + new_theme_name + '</h4></div><div class="ui divider"></div></div></div>'
		$('#tag-theme-grid').append(html);
		$('.add-tag-theme-modal').modal('hide')
		initTagThemeDragAndDrop();
	});

	$('#save-tag-theme-change').click(function() {
		tagthemedic = {};
		var themes = $(".tag-theme-name");
		for (var i=0; i<themes.length; i++){
			var theme = $($(themes)[i]).text();
			tagthemedic[theme] = [];
			console.log(theme)
			var tags = $($(themes)[i]).siblings(".tag-theme-tags");
			for (var j=0; j<tags.length; j++){
				console.log($(tags[j]).text());
				var tag = $(tags[j]).text()
				tagthemedic[theme].push(tag);
			}
		}

		json = JSON.stringify(tagthemedic);
		$.ajax({
		    url: '/api_tag_theme/',
		    type: 'POST',
		    data: {
		    	action: "save_tag_theme_change",
		    	tagthemedic: json,
		    },
		    success: function(result) {
		    	Utils.notify('success', 'Changes have been saved');
		    }
		});

	});

	function initTagThemeDragAndDrop() {
		// drag and drop for tag theming
		dragSrcEl = null;

		$(".tag-theme-segment").bind("dragover", function(event) {
		    event.preventDefault();  
		    event.stopPropagation();
		    $(this).addClass('dragging');
		});

		$(".tag-theme-tags").bind("dragstart", function(event) {
		    dragSrcEl = null;
		    dragSrcEl = this;
		});

		$(".tag-theme-tags").bind("dragleave", function(event) {
		    event.preventDefault();  
		    event.stopPropagation();
		    $(this).removeClass('dragging');
		});

		$('.tag-theme-segment').bind("drop", function(event) {
		    event.preventDefault();  
		    event.stopPropagation();
		    // if ($(dragSrcEl.siblings('.tag-theme-name')).text() === $(this).children('.tag-theme-name').text()){
		    // 	alert("Same");
		    // } else {
			$(this).append($(dragSrcEl));
			dragSrcEl = null;
			// }
		});
	}

	module.initLayout();
	return module;
});
