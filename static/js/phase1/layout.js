define([
	'semantic-ui',
	'realtime/socket',
	'ext/colorbrewer',
	'feed/activity-feed'
], function(
) {
	console.log("phase1");

	var module = {};
	
	// theme object
	module.Theme = {}
	module.Theme.themes = {};
	module.Theme.colorMap = {};
	module.Theme.init = function() {
		module.Theme.themes = {"All":"-1"};
	}
	module.Theme.put = function(theme_name, theme_id) {
		if (!(theme_name in module.Theme.themes)) {
			module.Theme.themes[theme_name] = theme_id;
		}
	}
	module.Theme.initColorSchema = function() {
		var i = 0;
		for (var theme_name in module.Theme.themes) {
			module.Theme.colorMap[module.Theme.themes[theme_name]] = colorbrewer["Pastel2"][8][i];
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
					if (highlight.author_id == sessionStorage.getItem('user_id')) {
						if (highlight.type !== 'comment') className = 'this_nugget';
					} else {
						if (highlight.type !== 'comment') className = 'other_nugget';
					}
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
				for (var theme_name in module.Theme.themes) {
					var theme_id = module.Theme.themes[theme_name];
					$("#nugget-list-theme").append('<option value="' + theme_id + '">' + theme_name + '</option>');
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
		$.ajax({
			url: '/workbench/api_get_doc_by_doc_id/',
			type: 'post',
			data: {
				'doc_id': doc_id,
			},
			success: function(xhr) {
				$("#workbench-document-container").html(xhr.workbench_document);
				module.render_highlights(doc_id);
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
		        $('.ui.rating').rating();

		        for (var theme_name in module.Theme.themes) {
					var theme_id = module.Theme.themes[theme_name];
					$(".theme-label[theme-id=" + theme_id + "]").css("background-color", module.Theme.colorMap[theme_id]);
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

	module.initEvents = function() {
		$('#document-toc-button').popup({
			on: 'click',
		    popup: '#document-toc-container', 
		    position: 'bottom left',
		});
		$('.ui.rating').rating();

		$("#nugget-list-theme").change(function() {
			module.get_nugget_list();
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
			console.log(module.Theme.themes);
			var container = $(this).parents(".workbench-nugget");
			var html = "<div class='reassign-options'><div style='overflow:hidden;'><button class='workbench-nugget-reassign-close' style='float:right;'><i class='remove icon'></i>close</button></div>";
			for (var theme_name in module.Theme.themes) {
				var theme_name = theme_name;
				var theme_id = module.Theme.themes[theme_name];
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
	};

	module.initTkEvents = function() {
		$("#workbench-document-container").on('click', '.tk', function(e) {
			e.stopPropagation();
			var highlight_ids = this.getAttribute('data-hl-id').split(' ');
			for (var i = 0; i < highlight_ids.length; i++) {
				$('#doc-thread-content').feed('update', {
					type: 'highlight',
					id: highlight_ids[i]
				}).done(function() {
					$('#nugget-thread-popup').css('left', e.pageX).css('top', e.pageY);
				});
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

	module.initLayout = function() {
		$.when(module.get_theme_list()).done(function(promise1) {
			$.when(module.get_nugget_list()).done(function(promise1) {
				module.get_document_toc();
			  	module.initEvents();
			  	module.initTkEvents();
			});		
		});
		// helper functions
	}
	module.initLayout();
});




