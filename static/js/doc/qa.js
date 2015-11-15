define([
	'utils',
	'doc/document',
	'feed/activity-feed'
], function(
	Utils,
	Document
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
			if (Document.doc_id == doc_id) {
				Document.updateHighlightFilter({
					switch: 'question'
				});
				Document.jumpToHighlight(highlight_id);
			} else {
				Document.doc_id = doc_id;
				Document
					.updateDocument()
					.done(function() {
						// jump to highlight
						Document.reloadHighlights()
							.done(function() {
								Document.updateHighlightFilter({
									switch: 'question'
								});
								Document.jumpToHighlight(highlight_id);
							});
					});
			}
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
