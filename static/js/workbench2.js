define([
	'utils',
	'feed/activity-feed'
], function(
	Utils
) {
	var module = {};
	module.initWorkbenchView = function() {

		// $(".document-table tbody").height($( window ).height() - 250);
		// $(window).resize(function() {
		// 	$(".document-table tbody").height($( window ).height() - 250);
		// }).resize();


		// highlighting
		module.highlightText = {};
		module.newHighlight = {};
		module.highlightsData = [];
		module.isDragging = false;
		
		module.currentThemeText = "";
		module.currentThemeId = "-1";
		module.claim_category = "finding";
		module.doc_id = "-1";
		
		module.claim_textarea_container = $("#workbench2-claim-textarea-container");
		module.claim_list_container = $("#workbench2-claim-container");
		module.nugget_list_container = $("#workbench2-nugget-container");
		module.focus_nugget_container = null;
		
		module.body_bottom = 230;

		load_toc();
		$.when(load_theme(), load_claim_list(), load_nugget_list(), load_init_doc()).done(function(promise1, promise2, romise3, promise4) {
		  	// load_highlights("-1");
		  	$("#loading-status").fadeOut("slow");
		});

		init_tk_event();
		init_button();
		initPopup();
		// initTutorial();
	
		// module.nugget_discussion_timer = setInterval(refresh_nugget_discussion, 3600000); // 1 hour
		// clearInterval(nugget_discussion_timer);
		
		require('doc/qa').updateQuestionList();
		
	};

	function initTutorial() {		// tutorial image slider
		$("body").on("click", ".image-next", getNext);
		$("body").on("click", ".image-prev", getPrev);
		$('#slider li').hide().filter(':first').show();
		$("#slider").css("height", $(".tutorial-image:first img")[0].naturalHeight);
		$(".image-count").text($(".tutorial-image:first").attr("data-id") + "/" + $(".tutorial-image").length);
		
		function getNext() {
			var $curr = $('.tutorial-image:visible'),
				$next = ($curr.next().length) ? $curr.next() : $('.tutorial-image').first();
			transition($curr, $next);
		}
		
		function getPrev() {
			var $curr = $('.tutorial-image:visible'),
				$next = ($curr.prev().length) ? $curr.prev() : $('.tutorial-image').last();
			transition($curr, $next);
		}
	
		function transition($curr, $next) {
			$next.css('z-index', 2).fadeIn('slow', function () {
				// $("#slider").animate({
				// 	"height": $next.height()}, 200);
				$curr.hide().css('z-index', 0);
				$next.css('z-index', 1);
			});
			$(".image-count").text($next.attr("data-id") + "/" + $(".tutorial-image").length);
		}
	}

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

	function load_init_doc() {
		$.ajax({
			url: '/workbench/api_get_init_doc/',
			type: 'post',
			data: {
			},
			success: function(xhr) {
				$("#workbench-document").html(xhr.workbench_document);
				$("#workbench2-document-container").animate({scrollTop: 0}, 0);
				module.doc_id = xhr.doc_id;
				module.load_highlights_by_doc();
				$("#workbench-document").height($(window).height() - module.body_bottom);
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});		
	}

	function load_toc() {
		$.ajax({
			url: '/workbench/api_get_toc/',
			type: 'post',
			data: {
			},
			success: function(xhr) {
				$("#workbench-document-toc-container").html(xhr.document_toc);
				$(".document-toc-sec-link").click(function(e) {
					var sec_id = e.target.getAttribute("data-id");			
					$.ajax({
						url: '/workbench/api_get_doc_by_sec_id/',
						type: 'post',
						data: {
							'sec_id': sec_id,
						},
						success: function(xhr) {
							$("#workbench-document").html(xhr.workbench_document);
							$("#workbench-document").height($(window).height() - module.body_bottom);
							
							$("#workbench-document").animate({scrollTop: 0}, 0);
							var tmp = $(".section-header[data-id=" + sec_id + "]").offsetParent().position().top;
							$("#workbench-document").animate({scrollTop: tmp}, 0);
							module.doc_id = xhr.doc_id;
							module.load_highlights_by_doc();
						},
						error: function(xhr) {
							if (xhr.status == 403) {
								Utils.notify('error', xhr.responseText);
							}
						}
					});
				});
				$(".document-toc-doc-link").click(function(e) {
					var doc_id = e.target.getAttribute("data-id");			
					$.ajax({
						url: '/workbench/api_get_doc_by_doc_id/',
						type: 'post',
						data: {
							'doc_id': doc_id,
						},
						success: function(xhr) {
							$("#workbench-document").html(xhr.workbench_document);
							$("#workbench-document").height($(window).height() - module.body_bottom);
							$("#workbench2-document-container").animate({scrollTop: 0}, 0);
							module.doc_id = xhr.doc_id;
							module.load_highlights_by_doc();
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

	function load_all_documents() {

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
		return promise;
	}

	function init_button() {

		$("body").on("click", '#show-sankey', function() {
			$("#sankey-container").show();
			$("#dark-fullscreen").show();
		})
		$("body").on("click", '#close-sankey', function() {
			$("#sankey-container").hide();
			$("#dark-fullscreen").hide();
		})

		// nugget context menu
  		$('body').on({
		    mouseenter: function(){
			  	if ($(this).hasClass("workbench-nugget")) {
			  		module.focus_nugget_container = $(this);
			  		if ($(this).find(".red").length > 0) {
			  			$nugget_operations = $("#nugget-operations-red");
					} else {
						$nugget_operations = $("#nugget-operations-green");
					}
					$nugget_operations.css("left", $(this).offset().left - $nugget_operations.css("width").slice(0, -2) + 5);
					$nugget_operations.css("top", $(this).offset().top + 5);	
			  	}
			  	if (module.focus_nugget_container.find(".red").length > 0) {
			  		$("#nugget-operations-red").show();
			  	} else {
			  		$("#nugget-operations-green").show();
			  	}
		    },mouseleave: function(){
			    $("#nugget-operations-green").hide();
			    $("#nugget-operations-red").hide();
		    }
		}, '.nugget-related');

  		// document context menu
  		$('body').on({
		    mouseenter: function(){
		  		$(".document-related").show();
				$("#workbench-document-toc-container").css("left", $("#workbench2-document-container").offset().left + $("#workbench2-document-container").width() - 10);
				$("#workbench-document-toc-container").css("top", $("#workbench2-document-container").offset().top + 10);	
		    },mouseleave: function(){
			    $("#workbench-document-toc-container").hide();
		    }
		}, '.document-related');


		$("body").on("click", "#workbench-document-back-to-top", function(e) {
			$("#workbench2-document-container").animate({scrollTop: 0}, 800);
		});

		module.nugget_list_container.on("click", "#workbench-nugget-operation-back", function(e) {
			load_nugget_list();
		});

		module.claim_list_container.on("click", "#workbench-claim-operation-back", function(e) {
			load_claim_list();
		});

		module.claim_textarea_container.on("click", ".workbench-claim-tab", function(e) {
			$(this).siblings().removeClass("positive");
			$(this).addClass("positive");
			module.claim_category = $(this).text().toLowerCase();
			load_claim_list();
		});

		// nugget button group
		$("body").on("click", ".use-nugget", function(e) {
			var $list_container = module.focus_nugget_container;
			var data_hl_id = $list_container.attr('data-hl-id');
			var content = $list_container.find(".description").attr("data");
			var textarea = module.claim_textarea_container.find("textarea")
			if (textarea.attr("data-id") !== undefined) {
				textarea.val(textarea.val() + " " + content).attr("data-id", textarea.attr("data-id")  + " " +  data_hl_id);
			} else {
				textarea.val(content).attr("data-id", data_hl_id);
			}
		});
		$("body").on("click", ".delete-nugget", function(e) {
			var $list_container = module.focus_nugget_container;
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
			var $list_container = module.focus_nugget_container;
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
		$("body").on("click", ".recover-nugget", function(e) {
			var data_hl_id = module.focus_nugget_container.attr('data-hl-id');
			var $list_container = module.focus_nugget_container;
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
		$("body").on("click", ".nugget2claim", function(e) {
			var $list_container = module.focus_nugget_container;
			var hl_id = $list_container.attr("data-hl-id");
			load_claim_list_partial(hl_id);
		});
		
		// Claim
		module.claim_list_container.on("click", ".workbench-remove-claim", function(e) {
			var claim_id = $(this).parents(".card").find(".workbench-claim-content").attr("claim-id");
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
		module.claim_textarea_container.on("click", ".workbench-clear-claim", function(e) {
			module.claim_textarea_container.find("textarea").attr("data-id", "").val("");
		});
		module.claim_textarea_container.on("click", ".workbench-add-claim", function(e) {
			var content = module.claim_textarea_container.find("textarea").val();
			var data_hl_ids = module.claim_textarea_container.find("textarea").attr("data-id");
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
					module.claim_textarea_container.find("textarea").attr("data-id", "").val("");
					load_claim_list();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		});
		module.claim_list_container.on("click", ".workbench-source-claim", function(e) {
			var highlight_ids = $(this).parents(".card").find(".workbench-claim-content").attr("data-id").trim();
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
				var def = '<a href="javascript:;" id="workbench-nugget-operation-back" class="item">< Full List</a>';
				$("#workbench-nugget-list").prepend(def);
			},			
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}
	
	function load_claim_list_partial(highlight_id) {
		$.ajax({
			url: '/workbench/api_load_claim_list_partial/',
			type: 'post',
			data: {
				highlight_id: highlight_id,
			},
			success: function(xhr) {
				$("#workbench-claim-list").html(xhr.workbench_claims);
				var def = '<a href="javascript:;" id="workbench-claim-operation-back" class="item">< Full List</a>';
				$("#workbench-claim-list").prepend(def);
			},			
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}

	function load_nugget_list() {
		var promise = $.ajax({
			url: '/workbench/api_load_nugget_list/',
			type: 'post',
			data: {
				theme_id: module.currentThemeId,
			},
			success: function(xhr) {
				$("#workbench-nugget-list").html(xhr.workbench_nugget_list);
				var def = '<a id="" class="item">button1</a>' + '<a id="" class="item">button2</a>';
				$("#workbench-nugget-operation-container").html(def);
			
				$("#workbench-nugget-list").height($(window).height() - module.body_bottom);

				// show more... / less
				var showChar = 200;
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

				$("#workbench-claim-list").height($(window).height() - (module.body_bottom + 230 + 14) );
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
				
				$('#current-phase')
				.popup({
					popup : $('#phase-instructions'),
					on    : 'hover'
				})
				;

				// bind click event to theme button
				$('#claim-theme-filter-menu').dropdown({
    				onChange: function(value, text, $selectedItem) {
						module.currentThemeText = text
						module.currentThemeId = $selectedItem.attr("data-id");
						$("#current-claim-theme-text").text(text);
						load_nugget_list();
						load_claim_list();
						clear_highlights();
						module.load_highlights_by_doc();
	    			}
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

	function init_tk_event() {

		$("#workbench-document").on('click', '.tk', function(e) {
			e.stopPropagation();
			if ($(this).hasClass('p') || $(this).hasClass('q') || $(this).hasClass('c')) {
				var highlight_ids = this.getAttribute('data-hl-id').split(' ');
				for (var i = 0; i < highlight_ids.length; i++) {
					$('#doc-thread-content').feed('update', {
						type: 'highlight',
						id: highlight_ids[i]
					}).done(function() {
						$('#doc-thread-popup').css('left', e.pageX).css('top', e.pageY);
					});
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
						module.newHighlight.end = e2.target.getAttribute('data-id');
						var min = Math.min(module.newHighlight.start, module.newHighlight.end);
						var max = Math.max(module.newHighlight.start, module.newHighlight.end);
						$target.find('.tk').removeClass('highlighted');
						for (var i = min; i <= max; i++) {
							$target.find('.tk[data-id="' + i + '"]').addClass('highlighted');
						}
						module.newHighlight.contextId = $target.attr('data-id');
					} else {
						$target.find('.tk').removeClass('highlighted');
					}
				});
				module.newHighlight.start = e.target.getAttribute('data-id');
				module.newHighlight.end = e.target.getAttribute('data-id');
			}
		}).on('mouseup', '.section-content', function(e) {
			$(window).off('mousemove');
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
					for (var i = 0; i < highlights.length; i ++) {
						text += highlights[i].textContent;
					};
					module.newHighlight.text = text;
					$('#doc-claim-form').hide();
					$('#doc-comment-form').parent().hide();
					$('#doc-highlight-toolbar').css('left', e.pageX).css('top', e.pageY);
				}
			} else { // just clicking
				$('#doc-highlight-toolbar').removeAttr('style');
				$(this).find('.tk').removeClass('highlighted');
			}
		});

	}

	function initPopup() {
		// popup toolbar
		$('.doc-anno-btn').click(function(e) {
			module.newHighlight.type = this.getAttribute('data-action');
			if (module.newHighlight.type == 'comment') {
				$('#doc-claim-form').hide();
				$('#doc-comment-form').show().parent().show();
				$('#doc-comment-form textarea').focus();
				$('#doc-comment-form label span').text('Add a comment');
			} else if (module.newHighlight.type == 'question') {
				$('#doc-claim-form').hide();
				$('#doc-comment-form').show().parent().show();
				$('#doc-comment-form textarea').focus();
				$('#doc-comment-form label span').text('Raise a question');
			} else if (module.newHighlight.type == 'claim') {
				$('#doc-comment-form').hide();
				$('#doc-claim-form').show().parent().show();
			}
		});
		// submitting posts & comments
		$('.doc-anno-submit').click(function(e) {
			var content = $(this).parents('form').find('textarea').val();
			if ($.trim(content).length == 0) {
				notify('error', 'Content must not be empty.');
				return;
			}
			$('#doc-highlight-toolbar .button').addClass('loading');
			$.ajax({
				url: '/api_highlight/',
				type: 'post',
				data: $.extend({
					action: 'create',
					content: content,
				}, module.newHighlight),
				success: function(xhr) {
					afterAddHighlight(xhr.highlight_id);
					// if it's a new question, dispatch.
					if (module.newHighlight.type == 'question') {
						var message = '<b>' + sessionStorage.getItem('user_name')
							+ '</b> ('
							+ sessionStorage.getItem('role')
							+ ') just asked a new question.';
						require('realtime/socket').dispatchNewQuestion({
							message: message
						});
					}
				},
				error: function(xhr) {
					$('#doc-highlight-toolbar .button').removeClass('loading');
					if (xhr.status == 403) {
						notify('error', xhr.responseText);
					}
				}
			});
		});
		// actions on highlights
		$('.doc-thread-btn').click(function(e) {
			var action = this.getAttribute('data-action');
			if (action == 'claim' && $('#doc-thread-content .event[data-type="claim"]').length) {
				Utils.notify('error', 'This highlight is already extracted as a claim');
				return;
			}
			$('#doc-thread-content').feed('switch', {
				'action': action
			});
			if (action == 'claim') {
				var highlight_id = $('#doc-thread-content').feed('get_id');
				$('#doc-thread-content .claim.form textarea').val(module.highlightText[highlight_id]).focus();
			}
		});
		
		$('#doc-claim-form').form({
			fields: {
			},
			onSuccess: function(e) {
				e.preventDefault();
				$('#doc-highlight-toolbar .button').addClass('loading');
				$.ajax({
					url: '/api_highlight/',
					type: 'post',
					data: $.extend({
						action: 'create',
						theme_id: $(this).find("select").val(),
					}, module.newHighlight, $('#doc-claim-form').form('get values')),
					success: function(xhr) {
						afterAddHighlight(xhr.highlight_id);
						$.when(load_nugget_list()).done(function(promise) {
							$("#workbench2-nugget-container").scrollTop(0);
						});
					},
					error: function(xhr) {
						$('#doc-highlight-toolbar .button').removeClass('loading');
						if (xhr.status == 403) {
							Utils.notify('error', xhr.responseText);
						}
					}
				});
			}
		});
		
	}

	function afterAddHighlight(newHighlightId) {
		// reset input boxes
		$('#doc-claim-form').form('reset');
		$('#doc-highlight-toolbar').removeAttr('style');
		$('#doc-highlight-toolbar textarea').val('');
		$('#doc-highlight-toolbar .button').removeClass('loading');
		$('.tk.highlighted').removeClass('highlighted');

		var newHighlightData = {
			author_id: sessionStorage.getItem('user_id'),
			context_id: module.newHighlight.contextId,
			start: module.newHighlight.start,
			end: module.newHighlight.end,
			id: newHighlightId,
			text: module.newHighlight.text,
			type: module.newHighlight.type
		};

		// dispatch to other users
		require('realtime/socket').dispatchNewHighlight(newHighlightData);

		// update current highlights dataset
		module.highlightsData.push(newHighlightData);

		// update question panel
		require('doc/qa').updateQuestionList();

		// switch to highlight type and update
		// module.updateHighlightFilter({
		// 	switch: module.newHighlight.type
		// });
		
		clear_highlights();
		module.load_highlights_by_doc();
		
	}

	function clear_highlights() {
		$('#workbench-document [data-hl-id]')
			.removeClass('n')
			.removeClass('t')
			.removeClass('c')
			.removeClass('p')
			.removeClass('q')
			.removeAttr('data-hl-id');
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

	module.load_highlights_by_doc = function() {
		var promise = $.ajax({
			url: '/workbench/api_load_highlights/',
			type: 'post',
			data: {
				theme_id: module.currentThemeId,
				doc_id: module.doc_id,
			},
			success: function(xhr) {
				clear_highlights();
				module.highlightsData = xhr.highlights;

				for (var j = 0; j < module.highlightsData.length; j++) {
					increase_page_loading_progress(10);
					var highlight = module.highlightsData[j];
					var $context = $("#workbench-document").find('.section-content[data-id="' + highlight.context_id + '"]');
					// assume orginal claims are nuggets now 
					var className = '';
					if (highlight.type == 'comment') {
						className = 'p'; // for 'post'
					} else if (highlight.type == 'question') {
						className = 'q'; // for 'question'
					} else if (highlight.type == 'claim') {
						className = 'c'; // for 'claim'
					} else if (highlight.type == 'tag') {
						className = 't'; // for 'tag
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

				$("#loading-status").fadeOut("slow");
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
		return promise;
	}

	return module;
});
