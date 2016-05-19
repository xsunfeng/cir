define([
	'semantic-ui',
	'realtime/socket'
], function(
) {
	console.log("phase2");
	var module = {

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
		},

		get_claim_list: function() {
			var promise = $.ajax({
				url: '/phase2/get_claim/',
				type: 'post',
				data: {
					theme_id: $("#nugget-list-theme").val(),
					claim_category: module.claim_category,
				},
				success: function(xhr) {
					$("#claim-list").html(xhr.workbench_claims);
					//set claim tab to the last one
					// $('.menu .item').tab();
					// if (module.curr_claim_tab != undefined) {
					// 	$('.tabular.menu .item[data-tab="' + module.curr_claim_tab + '"]').click();
					// }
					// increase_page_loading_progress(10);

					// $("#workbench-claim-list").height($(window).height() - (module.body_bottom + 230 + 14) );
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
		$.when(module.get_nugget_list(), module.get_claim_list()).done(function(promise1, promise2) {
		  	initEvents();
		});

		// helper functions
	}
	initLayout();
});



