define([
	'utils',
	'doc/document',
	'workbench2',
	'feed/activity-feed'
], function(
Utils,
	Document,
	Workbench
) {
	var module = {};

	$('#qa-wrapper')
		.on('click', '.refresh-list', function() {
			module.updateQuestionList();
		}).on('click', '.new-question', function() {
			$(this).toggleClass('active');
			$('#qa-wrapper .new.question.segment').toggleClass('hidden');
		}).on('click', '.find-in-doc', function() {
			var doc_id = this.getAttribute('data-id');
			var highlight_id = this.getAttribute('data-highlight-id');
			// if (Document.doc_id == doc_id) {
			// 	Document.updateHighlightFilter({
			// 		switch: 'question'
			// 	});
			// 	Document.jumpToHighlight(highlight_id);
			// } else {
			// 	Document.doc_id = doc_id;
			// 	Document
			// 		.updateDocument()
			// 		.done(function() {
			// 			// jump to highlight
			// 			Document.reloadHighlights()
			// 				.done(function() {
			// 					Document.updateHighlightFilter({
			// 						switch: 'question'
			// 					});
			// 					Document.jumpToHighlight(highlight_id);
			// 				});
			// 		});
			// }
			var hl_id = this.getAttribute('data-highlight-id');
			$.ajax({
				url: '/workbench/api_get_doc_by_hl_id/',
				type: 'post',
				data: {
					'hl_id': hl_id,
				},
				success: function(xhr) {
					console.log("hl_id"+ hl_id);
					if (xhr.doc_id == module.doc_id) {
						_jump();						
					} else {
						Workbench.doc_id = xhr.doc_id;	
						$("#workbench-document").html(xhr.workbench_document);
						$.when(Workbench.load_highlights_by_doc()).done(function(promise1) {
							$.when(load_one_highlight_by_id(hl_id)).done(function(promise1) {
								_jump();
							});
						});
					}
					
					function _jump() {
						$("#workbench2-document-container").animate({scrollTop: 0}, 0);
						var tmp1 = $($(".tk[data-hl-id*='" + hl_id + "']")[0]).position().top; 
						var tmp2 = $($(".tk[data-hl-id*='" + hl_id + "']")[0]).offsetParent().position().top;
						var tmp = tmp1 + tmp2 - 200;
						$("#workbench2-document-container").animate({scrollTop: tmp}, 0);
						$($(".tk[data-hl-id*='" + hl_id + "']")).css("background-color", "red");	
						setTimeout(function() {
							$($(".tk[data-hl-id*='" + hl_id + "']")).css("background-color", "#FBBD08");	
						}, 300);						
					}
					
					function load_one_highlight_by_id (hl_id) {
						var promise = $.ajax({
							url: '/workbench/api_load_one_highlight/',
							type: 'post',
							data: {
								hl_id: hl_id,
							},
							success: function(xhr) {
								var highlight = xhr.highlight;
								var $context = $("#workbench-document").find('.section-content[data-id="' + highlight.context_id + '"]');
								// assume orginal claims are nuggets now 
								var className = '';
								if (highlight.type == 'comment') {
									className = 'p'; // for 'post'
								} else if (highlight.type == 'question') {
									className = 'q'; // for 'question'
								} else if (highlight.type == 'claim') {
									className = 'c'; // for 'claim'
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
							},
							error: function(xhr) {
								if (xhr.status == 403) {
									Utils.notify('error', xhr.responseText);
								}
							}
						});
						return promise;
					}
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});			
						
		}).on('click', '.new.question .submit.button', function(e) {
			e.preventDefault();
			var content = $('#qa-wrapper .new.question textarea').val();
			if (content.length == 0) {
				Utils.notify('error', 'Content must not be empty.');
				return;
			}
			_qaUpdater({
				'action': 'raise-question',
				'content': content
			}).done(function() {
				$('#qa-wrapper .new.question.segment').addClass('hidden');
				// dispatch the event
				var message = '<b>' + sessionStorage.getItem('user_name')
					+ '</b> ('
					+ sessionStorage.getItem('role')
					+ ') just asked a new question.';
				require('realtime/socket').dispatchNewQuestion({
					message: message
				});
			});
		}).on('click', '.expand-thread', function() {
			var question_id = this.getAttribute('data-id');
			var $content = $(this).parents('.question.item .content');
			if ($(this).text() == 'Hide thread') {
				$('#qa-thread').hide();
				$(this).text('Show thread');
			} else {
				$(this).parents('.question.item').removeClass('need-refresh');
				// refresh thread when expanding thread
				$('#qa-list .expand-thread').text('Show thread');
				$(this).text('Hide thread');
				$('#qa-thread')
					.appendTo($content) // place thread under the question
					.show()
					.feed('update', {
						type: 'question',
						id: question_id
					});
			}
		});

	module.updateQuestionList = function() {
		_qaUpdater({
			'action': 'get-all-questions'
		});
	};

	module.newQuestionAdded = function(data) {
		var message = data.message + ' Please refresh this list.';
		$('#qa-refresh-prompter')
			.html(message)
			.removeClass('hidden');
	};

	module.newReplyAdded = function(data) {
		var question_id = data.target;
		var $question = $('#qa-list .question.item[data-id="' + question_id + '"]');
		$question.addClass('need-refresh');
		var replies = parseInt($question.find('.reply-cnt').text());
		$question.find('.reply-cnt').text(replies + 1);
	};

	function _qaUpdater(data) {
		$('#qa-list').css('opacity', '0.7');
		$('#qa-refresh-prompter').addClass('hidden');
		return $.ajax({
			url: '/api_qa/',
			type: 'post',
			data: data,
			success: function(xhr) {
				$('#qa-list').html(xhr.html);
				$('#qa-list').css('opacity', '1.0');
				$('#qa-thread').feed('init');
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
				$('#qa-list').css('opacity', '1.0');
			}
		});
	}
	return module;
});
