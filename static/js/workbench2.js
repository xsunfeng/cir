define([
	'utils',
	'feed/activity-feed'
], function(
	Utils
) {
	var module = {};
	module.initWorkbenchView = function() {

		set_page_loading_progress(20);

		module.highlightsData = [];
		module.highlightText = {};
		module.currentThemeText = "";
		module.currentThemeId = "-1";
		module.claim_category = "finding";
		$.when(load_theme(), load_all_documents(), load_claim_list()).done(function(promise1, promise2, promise3) {
		  	load_highlights("-1");
		  	increase_page_loading_progress(10);
		});
		load_nugget_list();
		// load_claim_list();
		init_tk_event();
		init_button();

		// $( window ).resize(function() {
		// 	adjust_layout();
		// });
		
		module.nugget_discussion_timer = setInterval(refresh_nugget_discussion, 3600000); // 1 hour
		// clearInterval(nugget_discussion_timer);
	};

	function set_page_loading_progress(number) {
		$('#page-loading-progress').progress({
		  	percent: number,
		  	onSuccess: function () {
		  		$('#page-loading-progress').find(".label").text("loading completed");
				setTimeout(function(){ 
					$('#page-loading-progress').fadeOut(3000)
				}, 6000);
		  	},
		});
	}
	function increase_page_loading_progress(number) {
		var new_number = parseInt($('#page-loading-progress').attr("data-percent")) + number;
		if (new_number <= 100) {
			set_page_loading_progress(new_number);
		}
	}

	function load_all_documents() {

		$.ajax({
			url: '/workbench/api_get_toc/',
			type: 'post',
			data: {
			},
			success: function(xhr) {
				$("#workbench-document-toc-container").html(xhr.document_toc);
				$('#workbench-document-toc').popup({
				    popup: '#workbench-document-toc-container',
				    on    : 'click',
				    position: "top left", 
				  })
				;
				$(".document-toc-sec-link").click(function(e) {
					$("#workbench-document-section").find(".data").animate({scrollTop: 0}, 0);
					var sec_id = $(this).attr('data-id'); 
					var tmp = $(".section-header[data-id=" + sec_id + "]").offsetParent().position().top;
					$("#workbench-document-section").find(".data").animate({scrollTop: tmp}, 0);
				});
				increase_page_loading_progress(10);
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});

		promise = $.ajax({
			url: '/workbench/api_load_all_documents/',
			type: 'post',
			data: {
			},
			success: function(xhr) {
				$("#workbench-document").html(xhr.workbench_document);
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
		return promise
	}

	function init_button() {
		$("#workbench-document-section").on("click", "#workbench-document-back-to-top", function(e) {
			$("#workbench-document-section").find(".data").animate({scrollTop: 0}, 800);
		});

		$("#workbench-nugget-section").on("click", "#workbench-nugget-operation-back", function(e) {
			load_nugget_list();
		});

		$("#workbench-claim-section").on("click", ".workbench-claim-tab", function(e) {
			$(this).siblings().removeClass("active");
			$(this).addClass("active");
			module.claim_category = $(this).text().toLowerCase();
			load_claim_list();
		});

		// nugget button group
		$("#workbench-nugget-container").on("click", ".use-nugget", function(e) {
			var $list_container = $(this).parentsUntil(".card").parent();
			var data_hl_id = $list_container.attr('data-hl-id');
			var content = $list_container.find(".description")[0].textContent.trim();
			var textarea = $("#workbench-claim-section").find("textarea")
			if (textarea.attr("data-id") !== undefined) {
				textarea.val(textarea.val() + " " + content).attr("data-id", textarea.attr("data-id")  + " " +  data_hl_id);
			} else {
				textarea.val(content).attr("data-id", data_hl_id);
			}
		});
		$("#workbench-nugget-container").on("click", ".delete-nugget", function(e) {
			var $list_container = $(this).parentsUntil(".card").parent();
			var hl_id = $list_container.attr("data-hl-id");
			$.ajax({
				url: '/workbench/api_remove_nugget/',
				type: 'post',
				data: {
					hl_id: hl_id,
				},
				success: function(xhr) {
					$list_container.html(xhr.workbench_single_nugget);
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});
		$("#workbench-nugget-container").on("click", ".source-nugget", function(e) {
			var $list_container = $(this).parents(".card");
			$("#workbench-document-panel").scrollTop(0);
			var tmp1 = $($(".tk[data-hl-id*='" + $list_container.attr('data-hl-id') + "']")[0]).position().top; 
			var tmp2 = $($(".tk[data-hl-id*='" + $list_container.attr('data-hl-id') + "']")[0]).offsetParent().position().top;
			var tmp = tmp1 + tmp2;
			$("#workbench-document-section").find(".data").scrollTop(tmp - 50);
			$($(".tk[data-hl-id*='" + $list_container.attr('data-hl-id') + "']")).fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);							
		});
		$("#workbench-nugget-container").on("click", ".reassign-nugget", function(e) {
			var $list_container = $(this).parents(".card");
			var html = "<div class='reassign-options'><div style='overflow:hidden;'><button class='workbench-nugget-reassign-close' style='float:right;'><i class='remove icon'></i>close</button></div>";
			for (var i = 0; i < $(".claim-theme-filter").length; i ++) {
				var id = $($(".claim-theme-filter")[i]).attr("data-id");
				var schema = $($(".claim-theme-filter")[i]).text();
				var html = html + '<button class="reassign-btn" data-id=' + id + '>' + schema + '</button>';
			}			
			var html = html + "</div>";	
			$list_container.append(html);
			$("#workbench-nugget-container").on("click", ".reassign-btn", function(e) {
				var data_hl_ids = $(this).parents(".card").attr('data-hl-id');
				var highlight_id = $list_container.attr('data-hl-id');
				var theme_id = $(this).attr("data-id");
				assign_nugget(highlight_id, theme_id);
				load_nugget_list();
			});
			$("#workbench-nugget-container").on("click", ".workbench-nugget-reassign-close", function(e) {
				var html = $(this).parents(".card").find(".reassign-options");
				html.remove();
			});
		});
		$("#workbench-nugget-container").on("click", ".recover-nugget", function(e) {
			var data_hl_id = $(this).parents(".card").attr('data-hl-id');
			var $list_container = $(this).parents(".card");
			$.ajax({
				url: '/workbench/api_change_to_nugget_1/',
				type: 'post',
				data: {
					data_hl_id: data_hl_id,
				},
				success: function(xhr) {
					$list_container.html(xhr.workbench_single_nugget);
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});		


		// claim list button group
		// $("#workbench-claim-section").on("click", ".workbench-edit-claim", function(e) {
		// 	$(this).parentsUntil('li').parent().find('.workbench-edit-claim').hide();
		// 	$(this).parentsUntil('li').parent().find('.workbench-save-claim').show();
		// 	var content = $(this).parentsUntil('li').parent().find('.workbench-claim-content').text();
		// 	var textarea = '<div class="ui form"><div class="field"><textarea rows="3">' + content + '</textarea></div></div>';
		// 	var content = $(this).parentsUntil('li').parent().find('.workbench-claim-content').html(textarea);
		// });
		$("#workbench-claim-section").on("click", ".workbench-remove-claim", function(e) {
			var claim_id = $(this).parentsUntil(".card").parent().find(".workbench-claim-content").attr("claim-id");
			$.ajax({
				url: '/workbench/api_remove_claim/',
				type: 'post',
				data: {
					claim_id: claim_id,
				},
				success: function(xhr) {
					load_claim_list();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});			
		});
		// $("#workbench-claim-section").on("click", ".workbench-save-claim", function(e) {
		// 	$(this).parentsUntil('li').parent().find('.workbench-edit-claim').show();
		// 	$(this).parentsUntil('li').parent().find('.workbench-save-claim').hide();
		// 	var content = $(this).parentsUntil('li').parent().find('textarea').val();
		// 	var html = content;
		// 	var content = $(this).parentsUntil('li').parent().find('.workbench-claim-content').html(html);

		// 	var claim_id = $(this).parentsUntil('li').parent().find(".workbench-claim-content").attr("claim-id");
		// 	$.ajax({
		// 		url: 'workbench/api_edit_claim/',
		// 		type: 'post',
		// 		data: {
		// 			claim_id: claim_id,
		// 			content: content.text(),
		// 		},
		// 		success: function(xhr) {
		// 			console.log(xhr);
		// 		},
		// 		error: function(xhr) {
		// 			if (xhr.status == 403) {
		// 				Utils.notify('error', xhr.responseText);
		// 			}
		// 		}
		// 	});
		// });
		$("#workbench-claim-section").on("click", ".workbench-clear-claim", function(e) {
			$("#workbench-claim-section").find("textarea").attr("data-id", "").val("");
		});
		$("#workbench-claim-section").on("click", ".workbench-add-claim", function(e) {
			var content = $("#workbench-claim-section").find("textarea").val();
			var data_hl_ids = $("#workbench-claim-section").find("textarea").attr("data-id");
			var category = module.claim_category;
			// $(this).siblings('ul').append("<li data-id ='" + data_hl_ids + "'>" + content + "</li>");
			$.ajax({
				url: '/workbench/api_add_claim/',
				type: 'post',
				data: {
					data_hl_ids: data_hl_ids,
					theme_id: module.currentThemeId,
					content: content,
					category: category,
				},
				success: function(xhr) {
					$("#workbench-claim-section").find("textarea").attr("data-id", "").val("");
					load_claim_list();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});
		$("#workbench-claim-section").on("click", ".workbench-source-claim", function(e) {
			highlight_ids = $(this).parents(".card").find(".workbench-claim-content").attr("data-id").trim();
			load_nugget_list_partial(highlight_ids);
		});

		$("body").on("click", "#chat-room-close-btn", function(){
			$("#chat-room-open-window").hide();
			$("#chat-room-close-window").show();
			clearInterval(module.nugget_discussion_timer);
		});
		$("body").on("click", "#chat-room-open-btn", function(){
			$("#chat-room-close-window").hide();
			$("#chat-room-open-window").show();
			$.when(load_nugget_discuss()).done(function(promise) {
				$("#chat-room-open-window").find(".data").scrollTop(9999);
			});
			module.nugget_discussion_timer = setInterval(refresh_nugget_discussion, 1000 * 5);
		});

		$("body").on("click", "#chat-room-open-add", function(){
			var content = $("#chat-room-open-window").find('textarea').val();
			$.ajax({
				url: '/workbench/add_nugget_comment/',
				type: 'post',
				data: {
					content: content,
					theme_id: module.currentThemeId,
				},
				success: function(xhr) {
					$("#workbench-nugget-discuss").html(xhr.workbench_nugget_comments);
					$("#chat-room-open-window").find('textarea').val("");
					$("#chat-room-open-window").find(".data").scrollTop(9999);
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});

		increase_page_loading_progress(10);
	}

	function refresh_nugget_discussion() {
		load_nugget_discuss();
		// console.log(Date());
	}

	function load_nugget_list_partial(highlight_ids) {
		$.ajax({
			url: '/workbench/api_load_nugget_list_partial/',
			type: 'post',
			data: {
				theme_id: module.currentThemeId,
				highlight_ids: highlight_ids,
			},
			success: function(xhr) {
				$("#workbench-nugget-list").html(xhr.workbench_nugget_list);
				var def = '<a id="workbench-nugget-operation-back" class="item">< Go back</a>';
				$("#workbench-nugget-operation-container").html(def);
			},			
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}

	function load_nugget_list() {
		$.ajax({
			url: '/workbench/api_load_nugget_list/',
			type: 'post',
			data: {
				theme_id: module.currentThemeId,
			},
			success: function(xhr) {
				$("#workbench-nugget-list").html(xhr.workbench_nugget_list);
				increase_page_loading_progress(10);
				var def = '<a id="" class="item">button1</a>' + '<a id="" class="item">button2</a>';
				$("#workbench-nugget-operation-container").html(def);
			},			
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}

	function load_nugget_discuss() {
		var promise = $.ajax({
			url: '/workbench/show_nugget_comment/',
			type: 'post',
			data: {
				theme_id: module.currentThemeId,
			},
			success: function(xhr) {
				$("#workbench-nugget-discuss").html(xhr.workbench_nugget_comments)
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
		return promise;
	}

	function load_claim_list() {
		var promise = $.ajax({
			url: '/workbench/api_get_claim_by_theme/',
			type: 'post',
			data: {
				theme_id: module.currentThemeId,
				claim_category: module.claim_category,
			},
			success: function(xhr) {
				$("#workbench-claim-list").html(xhr.workbench_claims);
				//set claim tab to the last one
				$('.menu .item').tab();
				if (module.curr_claim_tab != undefined) {
					$('.tabular.menu .item[data-tab="' + module.curr_claim_tab + '"]').click();
				}
				increase_page_loading_progress(10);
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
		return promise;
	}

	function load_theme() {
		
		var promise = $.ajax({
			url: '/workbench/api_load_all_themes/',
			type: 'post',
			data: {
			},
			success: function(xhr) {
				$("#workbench-theme-container").html(xhr.workbench_container);
				// bind click event to theme button
				$('#claim-theme-filter-menu').dropdown({
					action: 'combo',
    				onChange: function(value, text, $selectedItem) {
						module.currentThemeText = text
						module.currentThemeId = $selectedItem.attr("data-id");
						$("#current-claim-theme-text").text(text);
						load_nugget_list();
						load_claim_list();
						clear_highlights();
						load_highlights(module.currentThemeId);
	    			}
  				});
  				increase_page_loading_progress(10);
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});	
		return promise;
	}

	function init_tk_event() {
		$('.tk.n').popup("destroy");
		$('.tk.n').popup({
		    popup: '#workbench-document-operation-container',
		    on    : 'hover',
		    hoverable: 		true,
		    delay: {
			  	show: 300,
			}
	  	});
		$("#workbench-document-section").on("click", ".tk.n", function(e) {
			var _this = this;
			var res = this.textContent;
			while ($(_this.previousSibling).hasClass("n")) {
				_this = _this.previousSibling;
				res = _this.textContent + res;
			}
			_this = this;
			while ($(_this.nextSibling).hasClass("n")) {
				_this = _this.nextSibling;
				res = res + _this.textContent;
			}
			var data_hl_ids = $(this).attr("data-hl-id");

			$.ajax({
				url: '/workbench/api_change_to_nugget/',
				type: 'post',
				data: {
					data_hl_ids: data_hl_ids,
				},
				success: function(xhr) {
					$("#workbench-nugget-list").html(xhr.workbench_nuggets);
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});
		increase_page_loading_progress(10);
	}

	function clear_highlights() {
		$('#workbench-document [data-hl-id]')
			.removeClass('n')
	}

	function assign_nugget(highlight_id, theme_id){
		$.ajax({
			url: '/workbench/api_assign_nugget/',
			type: 'post',
			data: {
				highlight_id: highlight_id,
				theme_id: theme_id,
			},
			success: function(xhr) {
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}

	function load_highlights_by_doc() {

	}

	// theme_id == -1 indicates select all
	function load_highlights(theme_id, callback) {
		$.ajax({
			url: '/workbench/api_load_highlights/',
			type: 'post',
			data: {
				theme_id: theme_id,
			},
			success: function(xhr) {
				module.highlightsData = xhr.highlights;

				for (var j = 0; j < module.highlightsData.length; j++) {
					increase_page_loading_progress(10);
					var highlight = module.highlightsData[j];
					var $context = $("#workbench-document").find('.section-content[data-id="' + highlight.context_id + '"]');
					// assume orginal claims are nuggets now 
					var className = '';
					if (highlight.type == 'claim') {
						className = 'n'; // for 'claim'
					} 
					var text = [];
					// loop over all words in the highlight
					for (var i = highlight.start; i <= highlight.end; i++) {
						var $token = $context.find('.tk[data-id="' + i + '"]');
						text.push($token.text());
						// (1) add class name
						// (2) update data-hl-id
						if (typeof $token.attr('data-hl-id') == 'undefined') { // new highlight for this word
							$token.addClass(className).attr('data-hl-id', highlight.id);
						} else {
							var curr_id = $token.attr('data-hl-id'); // append highlight for this word
							$token.addClass(className).attr('data-hl-id', curr_id + ' ' + highlight.id);
						}
					}
					module.highlightText[highlight.id] = text.join('');
				}

				if (typeof callback == 'function') {
					callback();
				}
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}

	return module;
});
