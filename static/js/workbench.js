define([
	'utils',
	'feed/activity-feed'
], function(
	Utils
) {
	var module = {};
	module.initWorkbenchView = function() {
		module.highlightsData = [];
		module.highlightText = {};
		module.currentThemeText = "";
		module.currentThemeId = "-1";
		module.curr_claim_tab = "finding" 
		loadAllDocuments();
		$.when(load_theme(), load_claim_list()).done(function(promise1, promise2) {
		  	// Handle both XHR objects
		  	
		});
		load_nugget_list();
		// load_claim_list();
		load_highlights("-1");
		init_button();

		$('.ui.accordion').accordion();

		$("#document-toc-btn").click(function(){
			$('.ui.sidebar').sidebar('toggle');
			$(".document-toc-sec-link").click(function(e) {
				$("#workbench-document-panel").scrollTop(0);
				var sec_id = $(this).attr('data-id'); 
				var tmp = $(".section-header[data-id=" + sec_id + "]").offsetParent().position().top;
				$("#workbench-document-panel").scrollTop(tmp);
			});
		});

		// $( window ).resize(function() {
		// 	adjust_layout();
		// });
	};

	function loadAllDocuments() {

		$.ajax({
			url: '/workbench/api_get_toc/',
			type: 'post',
			data: {
			},
			success: function(xhr) {
				$("#document-toc").html(xhr.document_toc);
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});

		$.ajax({
			url: 'workbench/api_load_all_documents/',
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
	}

	function init_button() {

		// nugget button group
		$("#workbench-nugget-container").on("click", ".use-nugget", function(e) {
			var $list_container = $(this).parentsUntil("li").parent();
			var data_hl_id = $list_container.attr('data-hl-id');
			var content = $list_container.find("span")[0].textContent;
			var textarea = $(this).parentsUntil("#workbench-container").find(".tab.active").find("textarea");
			if (textarea.attr("data-id") !== undefined) {
				textarea.val(textarea.val() + " " + content).attr("data-id", textarea.attr("data-id")  + " " +  data_hl_id);
			} else {
				textarea.val(content).attr("data-id", data_hl_id);
			}
		});
		$("#workbench-nugget-container").on("click", ".delete-nugget", function(e) {
			var $list_container = $(this).parentsUntil("li").parent();
			var hl_id = $list_container.attr("data-hl-id");
			$.ajax({
				url: 'workbench/api_remove_nugget/',
				type: 'post',
				data: {
					hl_id: hl_id,
				},
				success: function(xhr) {
					load_nugget_list();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});
		$("#workbench-nugget-container").on("click", ".source-nugget", function(e) {
			var $list_container = $(this).parentsUntil("li").parent();
			$("#workbench-document-panel").scrollTop(0);
			var tmp1 = $($(".tk[data-hl-id*='" + $list_container.attr('data-hl-id') + "']")[0]).position().top; 
			var tmp2 = $($(".tk[data-hl-id*='" + $list_container.attr('data-hl-id') + "']")[0]).offsetParent().position().top;
			var tmp = tmp1 + tmp2;
			$("#workbench-document-panel").scrollTop(tmp - 50);
			$($(".tk[data-hl-id*='" + $list_container.attr('data-hl-id') + "']")).fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);							
		});
		$("#workbench-nugget-container").on("click", ".reassign-nugget", function(e) {
			var $list_container = $(this).parentsUntil("li").parent();
			var html = "<div class='reassign-options'>";
			for (var i = 0; i < $(".claim-theme-filter").length; i ++) {
				var id = $($(".claim-theme-filter")[i]).attr("data-id");
				var schema = $($(".claim-theme-filter")[i]).text();
				var html = html + '<button class="reassign-btn" data-id=' + id + '>' + schema + '</button>';
			}			
			var html = html + "</div>";	
			$list_container.append(html);
			$("#workbench-nugget-container").on("click", ".reassign-btn", function(e) {
				var data_hl_ids = $(this).parentsUntil("li").parent().attr('data-hl-id');
				var highlight_id = $list_container.attr('data-hl-id');
				var theme_id = $(this).attr("data-id");
				assign_nugget(highlight_id, theme_id);
				load_nugget_list();
			});
		});
		$("#workbench-nugget-container").on("click", ".recover-nugget", function(e) {
			var data_hl_ids = $(this).parentsUntil("li").parent().attr('data-hl-id');
			$.ajax({
				url: 'workbench/api_change_to_nugget/',
				type: 'post',
				data: {
					data_hl_ids: data_hl_ids,
				},
				success: function(xhr) {
					$("#workbench-nuggets").html(xhr.workbench_nuggets);
					load_nugget_list();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});		


		// claim list button group
		$("#workbench-claim-container").on("click", ".workbench-edit-claim", function(e) {
			$(this).parentsUntil('li').parent().find('.workbench-edit-claim').hide();
			$(this).parentsUntil('li').parent().find('.workbench-save-claim').show();
			var content = $(this).parentsUntil('li').parent().find('.workbench-claim-content').text();
			var textarea = '<div class="ui form"><div class="field"><textarea rows="3">' + content + '</textarea></div></div>';
			var content = $(this).parentsUntil('li').parent().find('.workbench-claim-content').html(textarea);
		});
		$("#workbench-claim-container").on("click", ".workbench-remove-claim", function(e) {
			var claim_id = $(this).parentsUntil('li').parent().find(".workbench-claim-content").attr("claim-id");
			$.ajax({
				url: 'workbench/api_remove_claim/',
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
		$("#workbench-claim-container").on("click", ".workbench-save-claim", function(e) {
			$(this).parentsUntil('li').parent().find('.workbench-edit-claim').show();
			$(this).parentsUntil('li').parent().find('.workbench-save-claim').hide();
			var content = $(this).parentsUntil('li').parent().find('textarea').val();
			var html = content;
			var content = $(this).parentsUntil('li').parent().find('.workbench-claim-content').html(html);

			var claim_id = $(this).parentsUntil('li').parent().find(".workbench-claim-content").attr("claim-id");
			$.ajax({
				url: 'workbench/api_edit_claim/',
				type: 'post',
				data: {
					claim_id: claim_id,
					content: content.text(),
				},
				success: function(xhr) {
					console.log(xhr);
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});
		$("#workbench-claim-container").on("click", ".workbench-add-claim", function(e) {
			var content = $(this).siblings(".form").find("textarea").val();
			var data_hl_ids = $(this).siblings(".form").find("textarea").attr("data-id");
			var category = $(this).parent().attr("data-tab");
			// $(this).siblings('ul').append("<li data-id ='" + data_hl_ids + "'>" + content + "</li>");
			$(this).parent().find("textarea").attr("data-id", "").val("");
			$.ajax({
				url: 'workbench/api_add_claim/',
				type: 'post',
				data: {
					data_hl_ids: data_hl_ids,
					theme_id: module.currentThemeId,
					content: content,
					category: category,
				},
				success: function(xhr) {
					module.curr_claim_tab = $('#workbench-tab>.item.active').attr("data-tab");
					load_claim_list();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});
		$("#workbench-claim-container").on("click", ".workbench-source-claim", function(e) {
			highlight_ids = $(this).parentsUntil("ul").find(".workbench-claim-content").attr("data-id").trim().split(" ");
			for (var i = 0; i < highlight_ids.length; i ++) {
				$tmp = $($(".workbench-nugget[data-hl-id='" + highlight_ids[i] + "']"));
				// $tmp.fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
				$tmp.css("background-color", "yellow").addClass("highlighted");
				setTimeout(
					function(){
						$(".highlighted").css("background", "none");
					}, 
				4000);	
			}
		});
	}

	function load_nugget_list() {
		$.ajax({
			url: 'workbench/api_load_nugget_list/',
			type: 'post',
			data: {
				theme_id: module.currentThemeId,
			},
			success: function(xhr) {
				$("#workbench-nugget-list").html(xhr.workbench_nugget_list);
			},			
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}


	function load_nugget_discuss() {

	}

	function adjust_layout() {
		// $("#workbench-theme-container").removeAttr("bottom");
		var workbench_theme_container_bottom = $("#workbench-theme-container").position().top+$("#workbench-theme-container").outerHeight(true);
		// $("#workbench-claim-container").css({"top": workbench_theme_container_bottom + "px"});
		// $("#workbench-document-container").css({"top": workbench_theme_container_bottom + "px"});
		// $("#workbench-nugget-container").css({"top": workbench_theme_container_bottom + "px"});
	}

	function load_claim_list() {
		var promise = $.ajax({
			url: 'workbench/api_get_claim_by_theme/',
			type: 'post',
			data: {
				theme_id: module.currentThemeId,
			},
			success: function(xhr) {
				$("#workbench-claim-list").html(xhr.workbench_claims);
				//set claim tab to the last one
				$('.menu .item').tab();
				if (module.curr_claim_tab != undefined) {
					$('.tabular.menu .item[data-tab="' + module.curr_claim_tab + '"]').click();
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

	function load_theme() {
		
		var promise = $.ajax({
			url: 'workbench/api_load_all_themes/',
			type: 'post',
			data: {
			},
			success: function(xhr) {
				$("#workbench-theme-container").html(xhr.workbench_container);
				// bind click event to theme button
				$("#workbench-theme-container").on("click", ".claim-theme-filter", function(e) {
					$(this).addClass('green').siblings('.green').removeClass('green')
					module.currentThemeText = $(this).text();
					module.currentThemeId = $(this).attr("data-id");
					load_nugget_list();
					load_claim_list();
					clear_highlights();
					load_highlights(module.currentThemeId, function(){
						$( ".tk.n").unbind( "click" );
						$(".tk.n").click(function(e) {
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
								url: 'workbench/api_change_to_nugget/',
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
					});
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

	function load_nuggets_and_claims(curr_claim_tab) {
		$.ajax({
			url: 'workbench/api_get_claim_by_theme/',
			type: 'post',
			data: {
				theme_id: module.currentThemeId,
			},
			success: function(xhr) {
				$("#workbench-claims").html(xhr.workbench_claims);
				$.ajax({
					url: 'workbench/add_nugget_comment/',
					type: 'post',
					data: {
						content: "",
						theme_id: module.currentThemeId,
					},
					success: function(xhr) {
						$(".workbench-nugget-discuss").html(xhr.workbench_nugget_comments)
					},
					error: function(xhr) {
						if (xhr.status == 403) {
							Utils.notify('error', xhr.responseText);
						}
					}
				});


				$(".workbench-add-nugget-comment").click(function(e) {
					var content = $(this).parentsUntil(".content").parent().find('textarea').val();
					$.ajax({
						url: 'workbench/add_nugget_comment/',
						type: 'post',
						data: {
							content: content,
							theme_id: module.currentThemeId,
						},
						success: function(xhr) {
							$(".workbench-nugget-comments").html(xhr.workbench_nugget_comments)
						},
						error: function(xhr) {
							if (xhr.status == 403) {
								Utils.notify('error', xhr.responseText);
							}
						}
					});
				});

				// initiate claim tab operations

			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}

	function clear_highlights() {
		$('#workbench-document [data-hl-id]')
			.removeClass('n')
	}

	function assign_nugget(highlight_id, theme_id){
		$.ajax({
			url: 'workbench/api_assign_nugget/',
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

	// theme_id == -1 indicates select all
	function load_highlights(theme_id, callback) {
		$.ajax({
			url: 'workbench/api_load_highlights/',
			type: 'post',
			data: {
				theme_id: theme_id,
			},
			success: function(xhr) {
				module.highlightsData = xhr.highlights;

				for (var j = 0; j < module.highlightsData.length; j++) {
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
