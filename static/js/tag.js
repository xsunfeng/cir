define([
	'utils',
	'feed/activity-feed'
], function(
	Utils
) {
	var module = {};
	module.initTagView = function() {
		// module.$category_element = $('#tagdocument-categories'); // static; initiate once
		// module.$content_element = $('#document-pane'); // static; initiate once
		// module.$annotation_element = $('#annotation-pane'); // static; initiate once

		module.newHighlight = {}
		module.currHighlights = {};
		module.isDragging = false;
		module.isIndividualTag = true;

		$("#tag-doc-content").on('click', '.jump-to-section', function(e) {
			var section_id = this.getAttribute('data-id');
			_jumpToSection(section_id);
		}).on('click', '.tk', function(e) {
			e.stopPropagation();
			// sec_id = $(this).parent().attr('data-id')
			// highlight_ids = this.getAttribute('data-activetag-id').split(' ');
			// $('#tag-thread-popup').css('left', e.pageX).css('top', e.pageY);
			// $("tag-thread-popup-selected-texts").empty();
			// $( "#associated-tags" ).empty();
			// var tagSet = new Set();
			// for (var i = 0; i < highlight_ids.length; i++) {
			// 	$.ajax({
			// 		url: '/api_tag/',
			// 		type:'post',
			// 		data: {
			// 			action: "show-tag",
			// 			highlight_id: highlight_ids[i],
			// 		},
			// 		success: function(xhr) {
			// 			if (!tagSet.has(xhr['tag'][0])) {
			// 				tagSet.add(xhr['tag'][0]);
			// 				$( "#associated-tags" ).append('<a class="ui label">' + xhr['tag'][0] + '</a>');
			// 			}
			// 		},
			// 		error: function(xhr) {
			// 			if (xhr.status == 403) {
			// 				notify('error', xhr.responseText);
			// 			}
			// 		}
			// 	});
			// }
		}).on('mousedown', '.section-content', function(e) {
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
				$("#tag-input-text").val("");
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
					$('#tag-thread-popup').css('left', e.pageX).css('top', e.pageY);
					// get selected texts
					var text = [];
					for (var j = module.newHighlight.start; j <= module.newHighlight.end; j++) {
						var $token = $(this).find('.tk[data-id="' + j + '"]');
						text.push($token.text());
					}
					hl = '"... ';
					for (var k = 0; k < text.length; k++) {
						hl = hl + text[k];
					}
					hl = hl + ' ..."';
					$("#tag-thread-popup-selected-texts").text(hl);

					$("#tag-thread-popup").on('click', '.remove', function(e) {
						$("#tag-thread-popup").css('left','-9999px');
						$("#tag-input-text").val("");
					});

					$("#tag-thread-popup").on('click', '.add-tag', function(e) {

			var rawData = $("#tag-input-text").val();
			rawDataArray = rawData.split(";")
			var content = []
			for (var i = 0; i < rawDataArray.length; i++){
				content.push(rawDataArray[i].trim())
			}
			console.log(content);
			console.log(Array.isArray(content));
			var nopublish = false;
			$.ajax({
				url: '/api_tag_input/',
				type: 'post',
				data: $.extend({
					action: 'create',
					tagcontent: JSON.stringify(content),
					nopublish: nopublish,
					doc_id: module.doc_id
				}, module.newHighlight),
				success: function(xhr) {
					for (var j=0;j<xhr.tags.length;j++){
						if ($( ".tag-section-nav:contains('" + xhr.tags[j] + "')").length > 0) {
							$(".tag-section-nav").each(function(){
								if ($(this).children('span').text() == xhr.tags[j]) {
									$(this).addClass('selected');
									$(this).addClass('green');
									for (var i = 0; i < xhr.highlights.length; i++) {
										activetags(xhr.highlights[i]);
									}		
								}			
							});								
						} else {
							var tmp = '<a class="tag-section-nav ui label"><span>' + xhr.tags[j] + '</span><div class="detail">#</div></a>'
							$(".token-input-list-feng").append(tmp);
							$(".tag-section-nav").each(function(){
								if ($(this).children('span').text() == xhr.tags[j]) {
									$(this).addClass('selected');
									$(this).addClass('green');
									for (var i = 0; i < xhr.highlights.length; i++) {
										activetags(xhr.highlights[i]);
									}		
								}			
							});	
						}
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

			$.ajax({
				url: '/api_tag_input/',
				type: 'post',
				data: {
					action:'load-individual-tag'
				},
				success: function(xhr) {
					$('#candidate-tags').html("")
					for(var i=0;i<xhr.result.length;i++){
						$('#candidate-tags').append('<a class="ui label candidate-tag">' + xhr.result[i] + '</a>')
					} 
					$('.candidate-tag').click(function(){
						var text = $("#tag-input-text").val();
						if (text === "") {
							text = $(this).text();
						} else {
							text = text + "; " + $(this).text();
						}
						$("#tag-input-text").val(text);
					});
					//tags used by others
					$.ajax({
						url: '/api_tag_input/',
						type: 'post',
						data: {
							action:'load-others-tag'
						},
						success: function(xhr) {
							$('#candidate-tags-others').html("")
							for(var i=0;i<xhr.result.length;i++){
								$('#candidate-tags-others').append('<a class="ui label candidate-tag-others">' + xhr.result[i] + '</a>')
							} 
							$('.candidate-tag-others').click(function(){
								var addedtag = $(this).text()
		                		$("#demo-input-plugin-methods").tokenInput("add", {id: S2id(addedtag), name: addedtag});
							});
						},
						error: function(xhr) {
							if (xhr.status == 403) {
								notify('error', xhr.responseText);
							}
						}
					});
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						notify('error', xhr.responseText);
					}
				}
			});


				}
			} else { // just clicking
				$('#doc-highlight-toolbar').removeAttr('style');
				$(this).find('.tk').removeClass('highlighted');
			}
		});

		$(document.body).on('click', '.tag-section-nav span',(function(e) {
			$.ajax({
				url: '/api_tagbling/',
				type:'post',
				data: {
					tag: $(e.target).text(),
				},
				success: function(xhr) {
					var doc_id = $(e.target).parents('.doc-container').attr('data-id')
					
					$(".tag-section-nav").filter(function() {
				    	return $(this).children('span').text() === $(e.target).text();
					}).each(function(){
						if($(this).hasClass('selected')){
							$(this).removeClass('selected');
							$(this).removeClass('green');
							for (var i = 0; i < xhr.highlights.length; i++) {
								deactivetags(xhr.highlights[i]);
							}
						}else{
							$(this).addClass('selected');
							$(this).addClass('green');
							for (var i = 0; i < xhr.highlights.length; i++) {
								activetags(xhr.highlights[i]);
							}
						}							
					});
				}
			});
		}));
	};

	module.updateCategories = function() {
		$.ajax({
			url: '/api_tag/',
			type: 'post',
			data: {
				'action': 'get-categories'
			},
			success: function(xhr) {
				$('#tag-doc-toc').html(xhr.html)
				// module.$category_element.find('.ui.accordion').accordion();
				// module.$category_element.find('abbr').popup();
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	};

	// dynamic listeners
	$('#tag-doc-toc').on('click', '.open-doc', function(e) {
		module.doc_id = this.getAttribute('data-id');
		updateDocument();
	});


// click tag label, activate tag highlighting
	function activetags(highlight) {
		var $context = $("#tag-doc-content").find('.section-content[data-id="' + highlight.context_id + '"]');
		var className = className = 'active t';
		var text = [];
		for (var i = highlight.start_pos; i <= highlight.end_pos; i++) {
			var $token = $context.find('.tk[data-id="' + i + '"]');
			text.push($token.text());
			if (typeof $token.attr('data-activetag-id') == 'undefined' || $token.attr('data-activetag-id').length==0) { // new highlight for this word
				$token.addClass(className).attr('data-activetag-id', highlight.id);;
			} else {
				var curr_id = $token.attr('data-activetag-id'); // append highlight for this word
				$token.addClass(className).attr('data-activetag-id', curr_id + ' ' + highlight.id);
			}
		}
		module.currHighlights[highlight.id] = highlight;
		module.currHighlights[highlight.id].text = text.join('');
	};
	// click tag label again, deactivate tag highlighting
	function deactivetags(highlight) {
		var $context = $("#tag-doc-content").find('.section-content[data-id="' + highlight.context_id + '"]');
		var className = className = 'active t';
		var text = [];
		for (var i = highlight.start_pos; i <= highlight.end_pos; i++) {
			var $token = $context.find('.tk[data-id="' + i + '"]');
			text.push($token.text());
			
			// split the strings in to array and remove the deselected one
			if ($token[0].hasAttribute('data-activetag-id')){
				var curr_ids = $token.attr('data-activetag-id').split(' ');
				var rem_id = curr_ids.indexOf(highlight.id.toString());
				if(rem_id > -1){
					curr_ids.splice(rem_id, 1);
				}
				if(curr_ids.length==0){
					$token.removeClass(className);
				}
				$token.attr('data-activetag-id', curr_ids.join(' '));
			}		
		}
	};

	function updateDocument() {
		$.ajax({
			url: '/api_tag/',
			type: 'post',
			data: {
				'action': 'get-document',
				'doc_id': module.doc_id
			},
			success: function(xhr) {
				// collapse document category accordion
				$('#tag-doc-content').html(xhr.html);
	
				$.ajax({
					url: '/api_get_individual_tag/',
					type: 'post',
					success: function(xhr) {
						if (xhr.individual_tag == "true"){
							module.isIndividualTag = true;
							$('.individual-tag-ind').checkbox('check');
							$(".tag-all-section").hide();
						} else{
							module.isIndividualTag = false;
							$('.collaborate-tag-ind').checkbox('check');
							$(".tag-my-section").hide();
						}
					},
					error: function(xhr) {
						if (xhr.status == 403) {
							notify('error', xhr.responseText);
						}
					}
				});
				

				$('.individual-tag-ind').on('click', function() {
					$('.individual-tag-ind').checkbox('check')
					module.isIndividualTag = true;
				    $.ajax({
						url: '/api_individual_tag_toggle/',
						type: 'post',
						data: {
							individual_tag: module.isIndividualTag
						},
						success: function(xhr) {
							$(".tag-my-section").show();
							$(".tag-all-section").hide();
						},
						error: function(xhr) {
							if (xhr.status == 403) {
								notify('error', xhr.responseText);
							}
						}
					});
			  	});
				$('.collaborate-tag-ind').on('click', function() {
					$('.collaborate-tag-ind').checkbox('check')
					module.isIndividualTag = false;
				    $.ajax({
						url: '/api_individual_tag_toggle/',
						type: 'post',
						data: {
							individual_tag: module.isIndividualTag
						},
						success: function(xhr) {
							$(".tag-my-section").hide();
							$(".tag-all-section").show();
						},
						error: function(xhr) {
							if (xhr.status == 403) {
								notify('error', xhr.responseText);
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

	return module;
});
