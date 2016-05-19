define([
	'semantic-ui',
	'realtime/socket'
], function(
) {
	console.log("phase2");
	var module = {};
	
	// theme object
	module.theme = {}
	module.theme.themes = {};
	module.theme.init = function() {
		module.theme.themes = {};
	}
	module.theme.put = function(theme_name, theme_id) {
		if (!(theme_name in module.theme.themes)) {
			module.theme.themes[theme_name] = theme_id;
		}
	}
	module.theme.init();

	module.get_theme_list = function() {
		var promise = $.ajax({
			url: '/phase2/get_theme_list/',
			type: 'post',
			data: {},
			success: function(xhr) {
				module.theme.init();
				for (var i = 0; i < xhr.themes.length; i++) {
					var theme = xhr.themes[i];
					module.theme.put(theme.name, theme.id);
				}
				$("#nugget-list-theme").empty();
				for (var theme_name in module.theme.themes) {
					$("#nugget-list-theme").append('<option value="' + module.theme.themes[theme_name] + '">' + theme_name + '</option>');
				}
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});	
		return promise;
	}

	module.get_nugget_list = function() {
		var promise = $.ajax({
			url: '/phase2/get_nugget_list/',
			type: 'post',
			success: function(xhr) {
				$("#workbench-nugget-list").html(xhr.workbench_nugget_list);

				for (highlight_id in xhr.highlight2claims) {
					var nugget = $(".workbench-nugget[data-hl-id=" + highlight_id + "]");
					nugget.attr("claim-ids", xhr.highlight2claims[highlight_id]);
					nugget.find(".use-nugget-num").text("(" + nugget.attr("claim-ids").split(",").length + ")");
				}
			
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

			    var theme_id = $("#nugget-list-theme").val();
				$(".workbench-nugget").hide();
				$(".workbench-nugget[theme-id=" + theme_id + "]").show();
			},			
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
		return promise;
	};

	module.get_claim_list = function() {
		var promise = $.ajax({
			url: '/phase2/get_claim_list/',
			type: 'post',
			data: {
				theme_id: $("#nugget-list-theme").val(),
			},
			success: function(xhr) {
				$("#claim-list").html(xhr.workbench_claims);
				$('.ui.rating').rating();
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
	};

	module.initEvents = function() {

		$("#nugget-list-theme").change(function() {
			var theme_id = $("#nugget-list-theme").val();
			$(".workbench-nugget").hide();
			$(".workbench-nugget[theme-id=" + theme_id + "]").show();
			module.get_claim_list();
		});

		$('.ui.rating').rating();

		// nugget button group
		$("body").on("click", ".use-nugget", function(e) {
			var container = $(this).parents(".workbench-nugget");
			container.find(".nugget-select-mark").show();
			var data_hl_id = container.attr('data-hl-id');
			var content = container.find(".description").attr("data");
			var textarea = $("#claim-maker").find("textarea");
			if (textarea.attr("data-id") !== undefined) {
				textarea.val(textarea.val() + "\n" + "\n" + content).attr("data-id", textarea.attr("data-id")  + "," +  data_hl_id);
			} else {
				textarea.val(content).attr("data-id", data_hl_id);
			}
		});
		$("body").on("click", ".source-nugget", function(e) {
			var $list_container = module.focus_nugget_container;
			var hl_id = $list_container.attr("data-hl-id");
			$.ajax({
				url: '/workbench/api_get_doc_by_hl_id/',
				type: 'post',
				data: {
					'hl_id': hl_id,
				},
				success: function(xhr) {
					$("#workbench-document").height($(window).height() - module.body_bottom);
					if (xhr.doc_id == module.doc_id) {
						_jump();						
					} else {
						module.doc_id = xhr.doc_id;	
						$("#workbench-document").html(xhr.workbench_document);
						$.when(module.load_highlights_by_doc()).done(function(promise1) {
							_jump();
						});
					}

					module.load_highlights_by_doc();
					module.get_viewlog();
					module.get_nuggetmap();
					
					function _jump() {
						$("#workbench-document").animate({scrollTop: 0}, 0);
						var tmp1 = $($(".tk[data-hl-id*='" + $list_container.attr('data-hl-id') + "']")[0]).position().top; 
						var tmp2 = $($(".tk[data-hl-id*='" + $list_container.attr('data-hl-id') + "']")[0]).offsetParent().position().top;
						var tmp = tmp1 + tmp2 - 200;
						$("#workbench-document").animate({scrollTop: tmp}, 0);
						$($(".tk[data-hl-id*='" + $list_container.attr('data-hl-id') + "']")).css("background-color", "red");	
						setTimeout(function() {
							$($(".tk[data-hl-id*='" + $list_container.attr('data-hl-id') + "']")).css("background-color", "#FBBD08");	
						}, 300);						
					}
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});						
		});
		$("body").on("click", ".reassign-nugget", function(e) {
			console.log(module.theme.themes);
			var container = $(this).parents(".workbench-nugget");
			var html = "<div class='reassign-options'><div style='overflow:hidden;'><button class='workbench-nugget-reassign-close' style='float:right;'><i class='remove icon'></i>close</button></div>";
			for (var theme_name in module.theme.themes) {
				var theme_name = theme_name;
				var theme_id = module.theme.themes[theme_name];
				html = html + '<button class="reassign-btn" data-id=' + theme_id + '>' + theme_name + '</button>';
			}			
			html = html + "</div>";	
			container.append(html);
			container.on("click", ".reassign-btn", function(e) {
				// var data_hl_ids = $(this).parents(".card").attr('data-hl-id');
				// var highlight_id = $list_container.attr('data-hl-id');
				// var theme_id = $(this).attr("data-id");
				// assign_nugget(highlight_id, theme_id);
				// load_nugget_list();
			});
			container.on("click", ".workbench-nugget-reassign-close", function(e) {
				var html = $(this).parents(".workbench-nugget").find(".reassign-options");
				html.remove();
			});
		});

		$("body").on("click", "#clear-claim", function(e) {
			$(".nugget-select-mark").hide();
			var textarea = $("#claim-maker").find("textarea");
			textarea.removeAttr("data-id");
			textarea.val("");
		});

		$("body").on("click", "#post-claim", function(e) {
			var textarea = $("#claim-maker").find("textarea");
			var content = textarea.val();
			var data_hl_ids = textarea.attr("data-id");
			$.ajax({
				url: '/phase2/put_claim/',
				type: 'post',
				data: {
					data_hl_ids: data_hl_ids,
					theme_id: $("#nugget-list-theme").val(),
					content: content,
				},
				success: function(xhr) {
					$("#clear-claim").click();
					module.get_claim_list();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});
		$("body").on("click", ".source-claim", function(e) {
			var container = $(this).parents(".workbench-claim-item");
			var highlight_ids = container.attr("nugget-ids").trim().split(",");
			$(".workbench-nugget").hide();
			$("#nugget-list-back").show();
			for (var i = 0; i < highlight_ids.length; i++){
				$(".workbench-nugget[data-hl-id=" + highlight_ids[i] + "]").show();
			}
		});
		$("body").on("click", ".use-nugget-num", function(e) {
			var container = $(this).parents(".workbench-nugget");
			var claim_ids = container.attr("claim-ids").trim().split(",");
			$(".workbench-claim-item").hide();
			$("#claim-list-back").show();
			for (var i = 0; i < claim_ids.length; i++){
				$(".workbench-claim-item[claim-id=" + claim_ids[i] + "]").show();
			}
		});
		$("body").on("click", "#nugget-list-back", function(e) {
			$(".workbench-nugget").show();
			$("#nugget-list-back").hide();
		});
		$("body").on("click", "#claim-list-back", function(e) {
			$(".workbench-claim-item").show();
			$("#claim-list-back").hide();
		});
		$(".nugget-select-mark").hover(
			function () {
				$(this).removeClass("green").addClass("red");
				$(this).find("i").removeClass("checkmark").addClass("remove")
			},
			function () {
				$(this).removeClass("red").addClass("green");
				$(this).find("i").removeClass("remove").addClass("checkmark");
			}
		);
		$(".nugget-select-mark").on("click", function(){
			$(this).hide();
			var nugget_id = $(this).parents(".workbench-nugget").attr("data-hl-id");
			var textarea = $("#claim-maker").find("textarea");
			var array = textarea.attr("data-id").split(",");
			var index = array.indexOf(nugget_id);
			if (index > -1) {
			    array.splice(index, 1);
			}
			textarea.attr("data-id", array.join());
		});

	};

	module.initLayout = function() {
		$.when(module.get_theme_list()).done(function(promise1) {
			$.when(module.get_nugget_list(), module.get_claim_list()).done(function(promise1, promise2) {
			  	module.initEvents();
			});		
		});
		// helper functions
	};

	module.initLayout();

	return module;
});




