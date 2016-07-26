define([
	'jquery',
	'utils',
	'workbench2',
	'feed/activity-feed'
], function(
	$,
	Utils,
	Workbench
) {
	var module = {};

	$("#qa-wrapper").on("click", ".reply-comment-save", function(){
		var text = $(this).closest("form").find("textarea").val();
		var claim_id = $("#claim-maker").attr("claim-id");
		var parent_id = $(this).attr("parent-id");
		var question_id = $(this).closest(".question").attr("data-id");
		$.ajax({
			url: '/phase2/add_comment_to_claim/',
			type: 'post',
			data: {
				parent_id: 		parent_id,
				text: 			text,
				claim_id: 		claim_id,
				comment_type: 	"comment",
			},
			success: function(xhr) {
				_qaUpdater({
					'action': 'get-question-list'
				}).done(function() {
					$("#qa-wrapper .question.item[data-id=" + question_id + "]").find(".expand-thread").click();
				});
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});	
	}).on("click", ".reply-comment-cancel", function(){
	 	var textarea = $(this).closest("form").find("textarea");
		textarea.val("");
		textarea.closest(".form").hide();
	}).on("click", ".reply-comment", function(){
	 	$(this).closest(".content").find(".form").show();
	}).on("click", ".question-resolved", function () {
		// become unresolved
		$(this).closest(".event").find(".question-unresolved").show();
		$(this).hide();
		var question_id = $(this).closest(".event").find(".summary").attr("comment-id");
		changeQuestionStatus(question_id, "false");
	}).on("click", ".question-unresolved", function () {
		// become resolved
		$(this).closest(".event").find(".question-resolved").show();
		$(this).hide();
		var question_id = $(this).closest(".event").find(".summary").attr("comment-id");
		changeQuestionStatus(question_id, "true");
	});

	$('#qa-wrapper')
		.on('click', '.refresh-list', function() {
			module.updateQuestionList();
		}).on('click', '.new-question', function() {
			$(this).toggleClass('active');
			$('#qa-wrapper .new.question.segment').toggle();
		}).on('click', '.find-in-doc', function() {
			var doc_id = this.getAttribute('data-id');
			var hl_id = this.getAttribute('data-highlight-id');
			$.ajax({
				url: '/workbench/api_get_doc_by_hl_id/',
				type: 'post',
				data: {
					'hl_id': hl_id,
				},
				success: function(xhr) {
					$("#document-container").html(xhr.workbench_document);
					$("#document-container-modal").modal("show");
					$(".modals").animate({scrollTop: 0}, 0);

					setTimeout(function(){
						var $highlight = $($("#document-container-modal .section-content[data-id=" + xhr.highlight.context_id + "] .tk[data-id=" + xhr.highlight.start + "]")[0]);
						$('.modals').animate({scrollTop: $highlight.offset().top - 200}, 1000);

						// var tmp1 = $highlight.position().top; 
						// var tmp2 = $highlight.offsetParent().position().top;
						// var tmp = tmp1 + tmp2 + 400;
						// console.log("tmp1 = " + tmp1);
						// console.log("tmp2 = " + tmp2);
						// $(".modals").animate({scrollTop: tmp}, 0);

						// loop over all words in the highlight
						for (var i = xhr.highlight.start; i <= xhr.highlight.end; i++) {
							var $token = $($("#document-container-modal .section-content[data-id=" + xhr.highlight.context_id + "] .tk[data-id=" + i + "]")[0]);
							$token.css("border-bottom", "3px solid red");
						}
					}, 500);
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});		
		}).on('click', '.make-comment', function(e) {
			e.preventDefault();
			var content = $('#qa-wrapper .new.question textarea').val();
			if (content.length == 0) {
				Utils.notify('error', 'Content must not be empty.');
				return;
			}
			var nugget_id = sessionStorage.getItem("active_nugget_id");
			sessionStorage.setItem("active_nugget_id", "");
			if (isNaN(nugget_id)) {
				nugget_id = ""
			}
			_qaUpdater({
				'action': 'raise-question',
				'text': content,
				"nugget_id": 	nugget_id
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
			$content.find(".expand-thread").hide();
			$content.find(".collapse-thread").show();
			$(this).parents('.question.item').removeClass('need-refresh');
			// refresh thread when expanding thread
			$('#qa-thread')
				.appendTo($content) // place thread under the question
				.show()
				.feed('update', {
					type: 'question',
					id: question_id
				});
			// I cannot find where the thread is loaded, so have to defer this events
			setTimeout(function(){
				$(".avatar1").popup('remove popup').popup('destroy');
				$(".avatar1").popup();
			}, 500);
		}).on('click', '.collapse-thread', function() {
			var question_id = this.getAttribute('data-id');
			var $content = $(this).parents('.question.item .content');
			$content.find(".expand-thread").show();
			$content.find(".collapse-thread").hide();
			$('#qa-thread').hide();
		}).on('click', '.direct-reply', function() {
			$(this).closest(".question").find(".expand-thread").click();
			setTimeout(function(){
				$($(".reply-comment")[0]).click();
			}, 1000);
		}).on('click', '.claim-question-vote', function() {
			var $container = $(this).closest('.question.item');
			question_id = $container.attr("data-id");
			$vote_btn = $container.find(".claim-question-vote");
			var vote = "true"
			if ($vote_btn.hasClass("voted")) {
				$vote_btn.removeClass("voted");
				$vote_btn.css("color", "");
				vote = "false"
			} else {
				$vote_btn.addClass("voted");
				$vote_btn.css("color", "green");			
			}
			$.ajax({
				url: '/phase2/vote_question/',
				type: 'post',
				data: {
					vote: 			vote,
					question_id: 	question_id,
				},
				success: function(xhr) {
					module.updateQuestionList();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}).on('click', '.claim-expert-vote', function() {
			var $container = $(this).closest('.question.item');
			question_id = $container.attr("data-id");
			$vote_btn = $container.find(".claim-expert-vote");
			var vote = "true"
			if ($vote_btn.hasClass("voted")) {
				$vote_btn.removeClass("voted");
				$vote_btn.css("color", "");
				vote = "false"
			} else {
				$vote_btn.addClass("voted");
				$vote_btn.css("color", "green");			
			}
			$.ajax({
				url: '/phase2/vote_expert/',
				type: 'post',
				data: {
					vote: 			vote,
					question_id: 	question_id,
				},
				success: function(xhr) {
					module.updateQuestionList();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}).on('click', '.claim-question-expert', function() {
			var $container = $(this).closest('.question.item');
			question_id = $container.attr("data-id");
			$expert_btn = $container.find(".claim-question-expert");
			var expert = "true"
			if ($expert_btn.hasClass("experted")) {
				$expert_btn.removeClass("experted");
				$expert_btn.css("color", "");
				expert = "false"
			} else {
				$expert_btn.addClass("experted");
				$expert_btn.css("color", "green");			
			}
			$.ajax({
				url: '/phase2/expert_question/',
				type: 'post',
				data: {
					expert: 		expert,
					question_id: 	question_id,
				},
				success: function(xhr) {
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});
		}).on('click', '.show-all', function() {
			$(this).addClass("active");
			$("#qa-wrapper .show-expert").removeClass("active");
			$("#qa-wrapper .question.item").show();
		}).on('click', '.show-expert', function() {
			$(this).addClass("active");
			$("#qa-wrapper .show-all").removeClass("active");
			$( "#qa-wrapper .question.item" ).filter(function() {
				return (! $(this).find(".claim-expert-vote").hasClass("experted"))
			}).hide();
		});

		$("body").on("click", "#qa-panel-toggle", function() {
			if ($("#qa-wrapper").is(":visible")) {
				$("#qa-wrapper").hide();
				$("#qa-panel-toggle").css("right", 0);
			} else {
				$("#qa-wrapper").show();
				$("#qa-panel-toggle").css("right", (0.4 * $(window).width()) - 10);
			}
		});

	module.updateQuestionList = function() {
		_qaUpdater({
			'action': 'get-question-list'
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
				$('.find-in-claim').popup({
					on: 'click'
				});
				if ($("#qa-wrapper .show-expert").hasClass("active")) {
					$("#qa-wrapper .show-expert").click();
				}
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
