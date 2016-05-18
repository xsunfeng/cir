define([
	'semantic-ui',
	'realtime/socket'
], function(
) {
	console.log("hah2");
	var module = {

		get_document_content: function(doc_id) {
			$.ajax({
				url: '/workbench/api_get_doc_by_doc_id/',
				type: 'post',
				data: {
					'doc_id': doc_id,
				},
				success: function(xhr) {
					$("#workbench-document-container").html(xhr.workbench_document);
					$("#workbench-document-container").height($(window).height() - module.body_bottom);
					$("#workbench2-document-container").animate({scrollTop: 0}, 0);
					// module.doc_id = xhr.doc_id;
					// module.load_highlights_by_doc();
					// module.get_viewlog();
					// module.get_nuggetmap();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		},

		get_document_toc: function() {
			$.ajax({
				url: '/workbench/api_get_toc/',
				type: 'post',
				data: {
				},
				success: function(xhr) {
					$("#document-toc-container").html(xhr.document_toc);
					$(".document-toc-doc-link").click(function(e) {
						var doc_id = e.target.getAttribute("data-id");			
						module.get_document_content(doc_id);
						$("#document-toc-container").popup("hide all");
					});
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});		
		},

		get_nugget_list: function() {
			var promise = $.ajax({
				url: '/workbench/api_load_nugget_list/',
				type: 'post',
				data: {
					theme_id: $("#nugget-list-theme").val(),
				},
				success: function(xhr) {
					$("#workbench-nugget-list").html(xhr.workbench_nugget_list);
					var def = '<a id="" class="item">button1</a>' + '<a id="" class="item">button2</a>';
					$("#workbench-nugget-operation-container").html(def);
				
					// show more... / less
					var showChar = 300;
				    var ellipsestext = "...";
				    var moretext = "more";
				    var lesstext = "less";
				    $('.more').each(function() {
				        var content = $(this).html();
				        if(content.length > showChar) {
				            var c = content.substr(0, showChar); // aaa b/bb ccc ddd
				            var h = content.substr(showChar, content.length - showChar); // bbb ccc ddd
				            var html = c + '<span class="moreellipses">' + ellipsestext+ '&nbsp;</span><span class="morecontent"><span>' + h + '</span>&nbsp;&nbsp;<a href="" class="morelink">' + moretext + '</a></span>';
				            $(this).html(html);
				        }
				    });		
			        $(".morelink").click(function(){
				        if($(this).hasClass("less")) {
				            $(this).removeClass("less");
				            $(this).html(moretext);
				        } else {
				            $(this).addClass("less");
				            $(this).html(lesstext);
				        }
				        $(this).parent().prev().toggle();
				        $(this).prev().toggle();
				        return false;
				    });  	

				},			
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
			return promise;

		}
	};
	function initEvents() {
		$('#document-toc-button').popup({
			on: 'click',
		    popup: '#document-toc-container', 
		    position: 'bottom left',
		});
		$('.ui.rating').rating();
	}
	function initLayout() {
		module.get_document_toc();
		$.when(module.get_nugget_list()).done(function(promise1) {
		  	initEvents();
		});

		// helper functions
	}
	initLayout();
});



