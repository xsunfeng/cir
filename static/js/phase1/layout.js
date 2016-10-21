define([
	'doc/qa',
	'semantic-ui',
	'realtime/socket',
	'ext/colorbrewer',
	'feed/activity-feed'
], function(
	QA
) {
	QA.updateQuestionList();

	var module = {};
	
	module.put_viewlog_interval = 3 * 1000;
	module.idle_reset_time = 15 * 1000;

	// theme object
	module.Theme = {}
	module.Theme.themes = {};
	module.Theme.colorMap = {};
	module.Theme.init = function() {
		module.Theme.themes = {};
	}
	module.Theme.put = function(theme_name, theme_id) {
		if (!(theme_name in module.Theme.themes)) {
			module.Theme.themes[theme_name] = theme_id;
		}
	}
	module.Theme.initColorSchema = function() {
		var i = 0;
		for (var theme_name in module.Theme.themes) {
			module.Theme.colorMap[module.Theme.themes[theme_name]] = colorbrewer["Pastel1"][8][i];
			i++;
		}
	}
	module.Theme.init();

	//highlight object
	module.Highlight = {};
	module.Highlight.textMap = {};
	module.Highlight.newHighlight = {};

	module.render_highlights = function(doc_id) {
		var promise = $.ajax({
			url: '/phase1/get_highlights/',
			type: 'post',
			data: {
				doc_id: doc_id,
				theme_id: $("#nugget-list-theme").val(),
			},
			success: function(xhr) {
				module.Highlight.highlights = xhr.highlights;
				for (var j = 0; j < module.Highlight.highlights.length; j++) {
					var highlight = module.Highlight.highlights[j];
					var $context = $("#workbench-document-container").find('.section-content[data-id="' + highlight.context_id + '"]');
					// assume orginal claims are nuggets now 
					var className = '';
					if (! module.Highlight.highlights[j].is_nugget) {
						className = 'this_is_a_question';
						// loop over all words in the highlight
						var text = [];
						for (var i = highlight.start; i <= highlight.end; i++) {
							var $token = $context.find('.tk[data-id="' + i + '"]');
							text.push($token.text());
							if (typeof $token.attr('data-hl-id') == 'undefined') { // new highlight for this word
								$token.addClass(className).attr('data-hl-id', highlight.id);
								$token.css("border-bottom", "3px solid red");
							} else {
								var curr_id = $token.attr('data-hl-id'); // append highlight for this word
								$token.addClass(className).attr('data-hl-id', curr_id + ' ' + highlight.id).attr("theme_id", cur_theme_id + ' ' + highlight.theme_id);
							}
						}
					} else {
						// loop over all words in the highlight
						var text = [];
						for (var i = highlight.start; i <= highlight.end; i++) {
							var $token = $context.find('.tk[data-id="' + i + '"]');
							text.push($token.text());
							if (typeof $token.attr('data-hl-id') == 'undefined') { // new highlight for this word
								$token.addClass(className).attr('data-hl-id', highlight.id).attr("theme_id", highlight.theme_id);
								$token.css("background-color", module.Theme.colorMap[highlight.theme_id]);
							} else {
								var curr_id = $token.attr('data-hl-id'); // append highlight for this word
								var cur_theme_id = $token.attr('theme_id');
								$token.addClass(className).attr('data-hl-id', curr_id + ' ' + highlight.id).attr("theme_id", cur_theme_id + ' ' + highlight.theme_id);
							}
						}						
					}

					module.Highlight.textMap[highlight.id] = text.join('');
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

	module.get_theme_list = function() {
		var promise = $.ajax({
			url: '/phase2/get_theme_list/',
			type: 'post',
			data: {},
			success: function(xhr) {
				module.Theme.init();
				for (var i = 0; i < xhr.themes.length; i++) {
					var theme = xhr.themes[i];
					module.Theme.put(theme.name, theme.id);
				}
				module.Theme.initColorSchema();
				$("#nugget-list-theme").empty();
				var content_alltheme = "All themes are shown."
				$("#nugget-list-theme").append('<option value="-1" data-content="' + content_alltheme + '">All</option>');
				$("#theme-info-popup .content").text(content_alltheme);
				for (var i = 0; i < xhr.themes.length; i++) {
					var theme_name = xhr.themes[i].name
					var theme_id = xhr.themes[i].id
					var theme_description = xhr.themes[i].description
					$("#nugget-list-theme").append('<option value="' + theme_id + '" data-content="' + theme_description + '">' + theme_name + '</option>');
					$("#nugget-tool-bar-themes").append('<option value="' + theme_id + '">' + theme_name + '</option>');
					$("#theme-top").append('<a class="ui label" ' + 'data-tooltip="' + theme_description + '" data-position="right center">'+ theme_name +'</a>');
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

	module.get_document_content = function(doc_id) {
		$("#doc-only").show();
		$.ajax({
			url: '/workbench/api_get_doc_by_doc_id/',
			type: 'post',
			data: {
				'doc_id': doc_id,
			},
			success: function(xhr) {
				$("#workbench-document-container").html(xhr.workbench_document);
				module.render_highlights(doc_id);
				module.applyFilter();
				// $("#workbench-document-container").height($(window).height() - module.body_bottom);
				// $("#workbench2-document-container").animate({scrollTop: 0}, 0);
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
	};

	module.get_document_toc = function() {
		$.ajax({
			url: '/workbench/api_get_toc/',
			type: 'post',
			data: {
			},
			success: function(xhr) {
				$("#document-toc-container").html(xhr.document_toc);
				$("#workbench-document-container").html(xhr.document_toc);
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
	};

	module.get_nugget_list = function() {
		var promise = $.ajax({
			url: '/phase1/get_nugget_list/',
			type: 'post',
			data: {
				theme_id: $("#nugget-list-theme").val(),
			},
			success: function(xhr) {
				$("#workbench-nugget-list").html(xhr.workbench_nugget_list);
			
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

		        for (var theme_name in module.Theme.themes) {
					var theme_id = module.Theme.themes[theme_name];
					$(".theme-label[theme-id=" + theme_id + "]").css("background-color", module.Theme.colorMap[theme_id]);
				}

				$(".avatar1").popup('remove popup').popup('destroy');
				$(".avatar1").popup();

				module.applyFilter();
				$(".workbench-nugget .action-bar").hide();
				$(".workbench-nugget .divider").hide();
			},			
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
		return promise;

	}

	module.initEvents = function() {

		$("body").on("click", ".workbench-nugget", function(){
			$(".workbench-nugget .action-bar").hide();
			$(".workbench-nugget .divider").hide();
			$($(this).find(".action-bar")).show();
			$($(this).find(".divider")).show();
		});

		$("#theme-info").popup({
			position: 	'bottom center',
		    popup: 		'#theme-info-popup'
		})

		$(".avatar1").popup('remove popup').popup('destroy');
		$(".avatar1").popup();
		$(".theme-label").popup();

		$('#document-toc-button').popup({
			on: 'click',
		    popup: '#document-toc-container', 
		    position: 'bottom left',
		});
		
		$('.ui.rating').rating();
		$('.ui.accordion').accordion();

		$("#nugget-list-theme").change(function() {
			var content = $("#nugget-list-theme option[value=" + $(this).val() + "]").attr("data-content");
			$("#theme-info-popup .content").text(content);
			module.applyFilter();
		});

		$("body").on("click", ".delete-nugget", function(e) {
			var container = $(this).closest(".workbench-nugget");
			var hl_id = container.attr("data-hl-id");
			$.ajax({
				url: '/workbench/api_remove_nugget/',
				type: 'post',
				data: {
					hl_id: hl_id,
				},
				success: function(xhr) {
					var doc_id = $(".workbench-doc-item").attr("data-id");
					module.get_document_content(doc_id);
					module.get_nugget_list();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});
		$("body").on("click", ".source-nugget", function(e) {
			var container = $(this).closest(".workbench-nugget");
			var hl_id = container.attr("data-hl-id");
			$.ajax({
				url: '/workbench/api_get_doc_by_hl_id/',
				type: 'post',
				data: {
					'hl_id': hl_id,
				},
				success: function(xhr) {
					var doc_id = $(".workbench-doc-item").attr("data-id");
					if (xhr.doc_id == doc_id) {
						_jump();						
					} else {
						$("#workbench-document-container").html(xhr.workbench_document);
						$.when(module.render_highlights(xhr.doc_id)).done(function(promise1) {
							_jump();
						});
					}
							
					function _jump() {
						$("#workbench-document-panel").animate({scrollTop: 0}, 0);
						var tmp1 = $($(".tk[data-hl-id*='" + hl_id + "']")[0]).position().top; 
						var tmp2 = $($(".tk[data-hl-id*='" + hl_id + "']")[0]).offsetParent().position().top;
						var tmp = tmp1 + tmp2 - 200;
						$("#workbench-document-panel").animate({scrollTop: tmp}, 0);
						$(".tk[data-hl-id*='" + hl_id + "']").css("background-color", "red");	
						setTimeout(function() {
							var hl = $(".tk[data-hl-id*='" + hl_id + "']");
							hl.css("background-color", module.Theme.colorMap[hl.attr("theme_id").split(" ")[0]]);	
						}, 500);						
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
			var container = $(this).closest(".workbench-nugget");
			var html = "<div class='reassign-options'><div style='overflow:hidden;'><button class='workbench-nugget-reassign-close' style='float:right;'><i class='remove icon'></i>close</button></div>";
			for (var theme_name in module.Theme.themes) {
				var theme_name = theme_name;
				var theme_id = module.Theme.themes[theme_name];
				html = html + '<button class="reassign-btn" data-id=' + theme_id + '>' + theme_name + '</button>';
			}			
			html = html + "</div>";	
			container.append(html);
			container.on("click", ".reassign-btn", function(e) {
				var $nugget = $(this).parents(".workbench-nugget")
				var highlight_id = $nugget.attr('data-hl-id');
				var theme_id = $(this).attr("data-id");
				$.ajax({
					url: '/phase1/change_nugget_theme/',
					type: 'post',
					data: {
						'highlight_id': highlight_id,
						'theme_id': theme_id
					},
					success: function(xhr) {		
						module.get_nugget_list();
					},
					error: function(xhr) {
						if (xhr.status == 403) {
							Utils.notify('error', xhr.responseText);
						}
					}
				});
			});
			container.on("click", ".workbench-nugget-reassign-close", function(e) {
				var html = $(this).closest(".workbench-nugget").find(".reassign-options");
				html.remove();
			});
		});
		$("body").on("click", ".comment-nugget", function(e) {
			var container = $(this).closest(".workbench-nugget");
			var highlight_id = container.attr('data-hl-id');
			showNuggetCommentModal(highlight_id);
		});

		var showNuggetCommentModal = function(highlight_id) {
			$.ajax({
				url: '/phase1/get_nugget_comment_list/',
				type: 'post',
				data: {
					'highlight_id': highlight_id,
				},
				success: function(xhr) {		
					$('#nugget-comment-highlight').html(xhr.nugget_comment_highlight);
					$('#nugget-comment-list').html(xhr.nugget_comment_list);
					$('#nugget-comment-modal').modal('show');
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});	
		}

		var updateNuggetCommentList = function() {
			var container = $("#nugget-comment-highlight").find(".workbench-nugget");
			var highlight_id = container.attr('data-hl-id');
			$.ajax({
				url: '/phase1/get_nugget_comment_list/',
				type: 'post',
				data: {
					'highlight_id': highlight_id,
				},
				success: function(xhr) {
					$('#nugget-comment-list').html(xhr.nugget_comment_list);
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});	
		}

		$("#nugget-comment-modal").on("click", ".nugget-comment-post", function(){
			var text = $(this).closest("form").find("textarea").val();
		 	var parent_id = "";
		 	var highlight_id = $("#nugget-comment-modal").find(".workbench-nugget").attr("data-hl-id");
		 	var textarea = $(this).closest("form").find("textarea");
			$.ajax({
				url: '/phase1/put_nugget_comment/',
				type: 'post',
				data: {
					'text': text,
					'parent_id': parent_id,
					'highlight_id': highlight_id,
				},
				success: function(xhr) {
					textarea.val("");
					updateNuggetCommentList();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}).on("click", ".nugget-comment-reply-save", function(){
			var text = $(this).closest("form").find("textarea").val();
		 	var parent_id = $(this).closest(".comment").attr("comment-id");
		 	var highlight_id = $("#nugget-comment-modal").find(".workbench-nugget").attr("data-hl-id");
		 	var textarea = $(this).closest("form").find("textarea");
			$.ajax({
				url: '/phase1/put_nugget_comment/',
				type: 'post',
				data: {
					'text': text,
					'parent_id': parent_id,
					'highlight_id': highlight_id,
				},
				success: function(xhr) {
					textarea.val("");
					textarea.closest(".form").hide();
					updateNuggetCommentList();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}).on("click", ".nugget-comment-reply-cancel", function(){
		 	var textarea = $(this).closest("form").find("textarea");
			textarea.val("");
			textarea.closest(".form").hide();
		}).on("click", ".nugget-comment-reply", function(){
		 	$(this).closest(".content").find(".form").show()
		});
		
		$("#workbench-document-container").on('click', '.tk', function(e) {
			e.stopPropagation();
			if ($(this).attr("data-hl-id") !== undefined) {
				if ($(this).hasClass("this_is_a_question")) {
					// open qa panel
					if (!$("#qa-wrapper").is(":visible")) {
						$("#qa-wrapper").show();
						$("#qa-panel-toggle").css("right", (0.4 * $(window).width()) - 10);
					}
					var nugget_id = $(this).attr("data-hl-id");
					$question = $(".find-in-doc[data-highlight-id = " + nugget_id + "]").closest(".question");
					$question.find(".expand-thread").click();
					$("#qa-wrapper").scrollTop(0);
					$("#qa-wrapper").scrollTop($question.position().top);
				}else {
					var highlight_ids = $(this).attr('data-hl-id').split(' ');
					showNuggetCommentModal(highlight_ids[0]);
				}			
			}
		}).on('mousedown', '.section-content', function(e) {
			$('#doc-highlight-toolbar').removeAttr('style');
			$('#doc-thread-popup').removeAttr('style');
			if ($(e.target).is('u.tk')) {
				var $target = $(this);
				$(window).mousemove(function(e2) {
					if ($(e2.target).hasClass('tk')) {
						module.isDragging = true;
						module.Highlight.newHighlight.end = e2.target.getAttribute('data-id');
						var min = Math.min(module.Highlight.newHighlight.start, module.Highlight.newHighlight.end);
						var max = Math.max(module.Highlight.newHighlight.start, module.Highlight.newHighlight.end);
						$target.find('.tk').removeClass('highlighted');
						for (var i = min; i <= max; i++) {
							$target.find('.tk[data-id="' + i + '"]').addClass('highlighted');
						}
						module.Highlight.newHighlight.contextId = $target.attr('data-id');
					} else {
						$target.find('.tk').removeClass('highlighted');
					}
				});
				module.Highlight.newHighlight.start = e.target.getAttribute('data-id');
				module.Highlight.newHighlight.end = e.target.getAttribute('data-id');
			}
		}).on('mouseup', '.section-content', function(e) {
			$(window).off('mousemove');
			var wasDragging = module.isDragging;
			module.isDragging = false;
			if (wasDragging) {
				var min = Math.min(module.Highlight.newHighlight.start, module.Highlight.newHighlight.end);
				var max = Math.max(module.Highlight.newHighlight.start, module.Highlight.newHighlight.end);
				module.Highlight.newHighlight.start = min;
				module.Highlight.newHighlight.end = max;

				if ($(this).find('.tk.highlighted').length) {
					var highlights = $(this).find('.tk.highlighted');
					var text = "";
					for (var i = 0; i < highlights.length; i ++) {
						text += highlights[i].textContent;
					};
					module.Highlight.newHighlight.text = text;
					$('#doc-highlight-toolbar').show();
					$('#doc-highlight-toolbar').css('left', e.pageX).css('top', e.pageY);

					// document inner container upper bound relative to document
					var tmp2 = $("#workbench-document-panel").offset().top;
					// distance scroll to the top
					var tmp3 = $("#workbench-document-panel").scrollTop()
					// start and end of nugget relative to document
					var st = $(this).find('.tk.highlighted')[0]
					var ed = $(this).find('.tk.highlighted')[$(this).find('.tk.highlighted').length - 1]
					var top = $(st).offset().top;
					var bottom = $(ed).offset().top;
					top = top - tmp2 + tmp3;
					bottom = bottom - tmp2 + tmp3;
					// overall height
					var height = $(".workbench-doc-item").height();
					module.Highlight.newHighlight.upper_bound = top / height;
					module.Highlight.newHighlight.lower_bound = bottom / height;
				}

			} else { // just clicking
				$('#doc-highlight-toolbar').removeAttr('style');
				$(this).find('.tk').removeClass('highlighted');
			}
		});

		$('#doc-only').checkbox().checkbox({
			onChecked: function() {
				module.applyFilter();
			},
		    onUnchecked: function() {
		    	module.applyFilter();
		    }
		});
		$("#doc-only").checkbox("uncheck");

		$("body").on("click", "#create-nugget", function() {
			$.ajax({
				url: '/api_highlight/',
				type: 'post',
				data: $.extend({
					action: 'create',
					theme_id: $("#nugget-tool-bar-themes").val(),
					hl_type: "nugget"
				}, module.Highlight.newHighlight, $('#doc-claim-form').form('get values')),
				success: function(xhr) {
					// send nugget map
					$.ajax({
						url: '/sankey/put_nuggetmap/',
						type: 'post',
						data: {
							"upper_bound": 	module.Highlight.newHighlight.upper_bound,
							"lower_bound": 	module.Highlight.newHighlight.lower_bound,
							"doc_id": 		$(".workbench-doc-item").attr("data-id"),
							"author_id": 	sessionStorage.getItem('user_id'),
							"theme_id":		$("#nugget-tool-bar-themes").val()
						},
						success: function(xhr) {
						},
						error: function(xhr) {
							$('#doc-highlight-toolbar .button').removeClass('loading');
							if (xhr.status == 403) {
								Utils.notify('error', xhr.responseText);
							}
						}
					});
					afterAddHighlight(xhr.highlight_id);
				},
				error: function(xhr) {
					$('#doc-highlight-toolbar .button').removeClass('loading');
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}).on("click", "#ask-question-about-nugget", function() {
			$.ajax({
				url: '/api_highlight/',
				type: 'post',
				data: $.extend({
					action: 'create',
					theme_id: $("#nugget-tool-bar-themes").val(),
					hl_type: "question"
				}, module.Highlight.newHighlight, $('#doc-claim-form').form('get values')),
				success: function(xhr) {
					// send nugget map
					// open q&a panel 
					sessionStorage.setItem("active_nugget_id", xhr.highlight_id);
					if (!$("#qa-wrapper").is(":visible")) {
						$("#qa-wrapper").show();
						$("#qa-panel-toggle").css("right", (0.4 * $(window).width()) - 10);
					}
					if(!$(".make-comment").is(":visible")) {
						$("#qa-wrapper .new-question").click();
					}
					afterAddHighlight(xhr.highlight_id);
				},
				error: function(xhr) {
					$('#doc-highlight-toolbar .button').removeClass('loading');
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});			
		});

		function afterAddHighlight(newHighlightId) {
			// reset input boxes
			$('#doc-highlight-toolbar').hide();

			// dispatch to other users
			//require('realtime/socket').dispatchNewHighlight(newHighlightData);

			// update current highlights dataset
			//module.highlightsData.push(newHighlightData);

			// update question panel
			// require('doc/qa').updateQuestionList();

			var doc_id = $(".workbench-doc-item").attr("data-id");
			module.get_document_content(doc_id);
			module.get_nugget_list();
		}

	};

	module.applyFilter = function() {

		$( ".workbench-nugget" ).hide();
		$( ".workbench-nugget" ).filter(function() {
			if ($("#nugget-list-theme").val() !== "-1") {
				return $(this).attr("theme-id") == $("#nugget-list-theme").val();
			} else {
				return $(this);
			}
		}).filter(function() {
			if ($('#doc-only').hasClass("checked")) {
				return $(this).attr("doc-id") == $(".workbench-doc-item").attr("data-id");
			} else {
				return $(this);
			}
		}).show();	
	}

	module.initLayout = function() {
		$.when(module.get_theme_list()).done(function(promise1) {
			$.when(module.get_nugget_list()).done(function(promise1) {
				module.get_document_toc();
			  	module.initEvents();
			});		
		});

		// put heatmap
		idleTime = 0
		idleInterval = setInterval(function() {
			idleTime = idleTime + 1;
			if (idleTime < Math.floor(module.idle_reset_time / module.put_viewlog_interval) && $(".workbench-doc-item").is(":visible")) {
			  if ($("#header-user-name").attr("data-role") !== "panelist") return;
			  var upper = $("#workbench-document-panel").scrollTop();
			  var lower = $("#workbench-document-panel").scrollTop() + $("#workbench-document-panel").height();
			  var height = $("#workbench-document-container").height();
			  var doc_id = $(".workbench-doc-item").attr("data-id");
			  var author_id = $("#header-user-name").attr("data-id");
			  $.ajax({
					url: '/sankey/put_viewlog/',
					type: 'post',
					data: {
					  "doc_id": 	doc_id,
					  "lower": 		lower,
					  "upper": 		upper,
					  "height": 	height,
					  "author_id": 	author_id
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
		}, module.put_viewlog_interval); // every 5s
		$("body").on("mousemove", "#workbench-document-container", function(e){
			idleTime = 0;
		})

	}
	module.initLayout();
});




