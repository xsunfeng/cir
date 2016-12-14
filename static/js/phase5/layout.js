define([
	'doc/qa',
	'utils',
	'semantic-ui',
	'realtime/socket',
	'ext/colorbrewer',
	'feed/activity-feed',
	'jquery.ui'
], function(
	QA,
	Utils
) {
	QA.updateQuestionList();

	sessionStorage.setItem('category', 'finding');

	var module = {};

	$("body").on("click", ".upvote", function(){
		if ($(this).hasClass("teal")) {
			// not vote yet
			$(this).find("span").text("Voted")
			$(this).removeClass("teal");
			var num = $(this).find(".detail").text() - (-1);
			$(this).find(".detail").text(num);
		} else {
			// already voted
			$(this).find("span").text("Useful")
			$(this).addClass("teal");
			var num = $(this).find(".detail").text() - 1;
			$(this).find(".detail").text(num);
		}
	})

	var showForumCommentList = function() {
		$.ajax({
			url: '/phase5/get_statement_comment_list/',
			type: 'post',
			data: {
			},
			success: function(xhr) {	
				$('#forum-comment').html(xhr.forum_comment);

				$('textarea').each(function () {
					this.setAttribute('style', 'height:' + (this.scrollHeight) + 'px;overflow-y:hidden;');
				}).on('input', function () {
					this.style.height = 'auto';
					this.style.height = (this.scrollHeight) + 'px';
				});
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});	
	}

	$("body").on("click", ".comment-post", function(){
		var textarea = $(this).closest(".comment-container").find("textarea");
		var text = textarea.val();
	 	var parent_id = "";
	 	if (text == "") {
	 		Utils.notify('warning', "Empty content not accepted");
	 	} else {
			$.ajax({
				url: '/phase5/put_statement_comment/',
				type: 'post',
				data: {
					'text': text,
					'parent_id': parent_id,
				},
				success: function(xhr) {
					textarea.val("");
					showForumCommentList();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						Utils.notify('error', xhr.responseText);
					}
				}
			});	 		
	 	}
	}).on("click", ".comment-reply-save", function(){
		var text = $(this).closest("form").find("textarea").val();
	 	var parent_id = $(this).closest(".comment").attr("comment-id");
	 	var textarea = $(this).closest("form").find("textarea");
		$.ajax({
			url: '/phase5/put_statement_comment/',
			type: 'post',
			data: {
				'text': text,
				'parent_id': parent_id,
			},
			success: function(xhr) {
				textarea.val("");
				textarea.closest(".form").hide();
				showForumCommentList();
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}).on("click", ".comment-reply-cancel", function(){
	 	var textarea = $(this).closest("form").find("textarea");
		textarea.val("");
		textarea.closest(".form").hide();
	}).on("click", ".comment-reply", function(){
	 	$(this).closest(".content").find(".form").show();
		$('textarea').each(function () {
			this.setAttribute('style', 'height:' + (this.scrollHeight) + 'px;overflow-y:hidden;');
		}).on('input', function () {
			this.style.height = 'auto';
			this.style.height = (this.scrollHeight) + 'px';
		});
	});

	showForumCommentList();

});




