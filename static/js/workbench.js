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
		module.currentThemeId = "";

		loadAllDocuments();

		$("#document-toc-btn").click(function(){
			$('.ui.sidebar').sidebar('toggle');
			$(".document-toc-sec-link").click(function(e) {
				$("#workbench-document").scrollTop(0);
				var sec_id = $(this).attr('data-id'); 
				var tmp = $(".section-header[data-id=" + sec_id + "]").offsetParent().position().top;
				$("#workbench-document").scrollTop(tmp);
			});
		});
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

		$.ajax({
			url: 'workbench/api_load_all_themes/',
			type: 'post',
			data: {
			},
			success: function(xhr) {
				$("#workbench-container").html(xhr.workbench_container);
				$(".claim-theme-filter").click(function(e) {
					$(this).addClass('green').siblings('.green').removeClass('green')
					module.currentThemeText = $(this).text();
					module.currentThemeId = $(this).attr("data-id");
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
									$("#workbench-nuggets").html(xhr.workbench_nuggets);
									load_nuggets_and_claims();
								},
								error: function(xhr) {
									if (xhr.status == 403) {
										Utils.notify('error', xhr.responseText);
									}
								}
							});
						});

						load_nuggets_and_claims();
					});

				});
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});

		load_highlights("-1");
	}

	function load_nuggets_and_claims() {
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
						$(".workbench-nugget-comments").html(xhr.workbench_nugget_comments)
					},
					error: function(xhr) {
						if (xhr.status == 403) {
							Utils.notify('error', xhr.responseText);
						}
					}
				});
				$(".use-nugget").unbind( "click" );
				$(".use-nugget").click(function(e) {
					var data_hl_id = $(this).parent().attr('data-hl-id');
					var content = $(this).parent().find("span")[0].textContent;
					var textarea = $(this).parentsUntil("#workbench-container").find(".tab.active").find("textarea");
					if (textarea.attr("data-id") !== undefined) {
						textarea.val(textarea.val() + " " + content).attr("data-id", textarea.attr("data-id")  + " " +  data_hl_id);
					} else {
						textarea.val(content).attr("data-id", data_hl_id);
					}
				});
				$(".delete-nugget").click(function(e) {
					$(this).parent().remove();
					var hl_id = $(this).parent().attr("data-hl-id");
					$.ajax({
						url: 'workbench/api_remove_nugget/',
						type: 'post',
						data: {
							hl_id: hl_id,
						},
						success: function(xhr) {
						},
						error: function(xhr) {
							if (xhr.status == 403) {
								Utils.notify('error', xhr.responseText);
							}
						}
					});
				});
				$(".source-nugget").unbind( "click" );
				$(".source-nugget").click(function(e) {
					$("#workbench-document").scrollTop(0);
					var tmp = $($(".tk[data-hl-id*='" + $(this).parent().attr('data-hl-id') + "']")[0]).position().top + $($(".tk[data-hl-id*='" + $(this).parent().attr('data-hl-id') + "']")[0]).offsetParent().position().top;
					$("#workbench-document").scrollTop(tmp);
					$($(".tk[data-hl-id*='" + $(this).parent().attr('data-hl-id') + "']")).fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);							
				});

				$('.ui.accordion').accordion();
				$(".workbench-edit-claim").click(function(e) {
					$(this).parentsUntil('li').parent().find('.workbench-edit-claim').hide();
					$(this).parentsUntil('li').parent().find('.workbench-save-claim').show();
					var content = $(this).parentsUntil('li').parent().find('.workbench-claim-content').text();
					var textarea = '<div class="ui form"><div class="field"><textarea rows="3">' + content + '</textarea></div></div>';
					var content = $(this).parentsUntil('li').parent().find('.workbench-claim-content').html(textarea);
				});
				$(".workbench-save-claim").click(function(e) {
					$(this).parentsUntil('li').parent().find('.workbench-edit-claim').show();
					$(this).parentsUntil('li').parent().find('.workbench-save-claim').hide();
					var content = $(this).parentsUntil('li').parent().find('textarea').val();
					var html = content;
					var content = $(this).parentsUntil('li').parent().find('.workbench-claim-content').html(html);
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
				$('.menu .item').tab();
				$(".workbench-add-claim").click(function(e) {
					var content = $(this).siblings(".form").find("textarea").val();
					var data_hl_ids = $(this).siblings(".form").find("textarea").attr("data-id");
					var category = $(this).parent().attr("data-tab");
					$(this).siblings('ul').append("<li data-id ='" + data_hl_ids + "'>" + content + "</li>");
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
						},
						error: function(xhr) {
							if (xhr.status == 403) {
								Utils.notify('error', xhr.responseText);
							}
						}
					});
				});
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
