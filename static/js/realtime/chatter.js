define([
	'jquery'
], function(
	$
) {
	var module = {
		'addOnlineUser': function(userinfo) {
			if (!isNaN(userinfo.user_id)) {
				$('#chatter-wrapper .online.users.list').find(".label[data-user-id=" + userinfo.user_id + "]").addClass("blue");
			}
			// $('#chatter-wrapper .online.users.list').append(getUserLabel(userinfo));
		},
		'removeOnlineUser': function(user_id) {
			$('#chatter-wrapper .online.users.list').find(".label[data-user-id=" + user_id + "]").removeClass("blue");
			// $('#chatter-wrapper .online.users .label[data-user-id="' + user_id + '"]').remove();
		},
		'showMsg': function(msg) {
			$('#chatter-wrapper').transition('bounce');
			$('#chatter-wrapper .comments.list').append(getMsgHtml(msg));
			scrollToBottom();
		},
		'loadRecentHistory': function() {
			$.ajax({
				url: '/api_chatter/',
				type: 'post',
				data: {
					'action': 'recent-history'
				},
				success: function(xhr) {
					var html = '';
					for (var i = 0; i < xhr.messages.length; i++) {
						html += getMsgHtml(xhr.messages[i]);
					}
					html += '<div class="ui message">Above are recent messages</div>';
					$('#chatter-wrapper .comments.list').prepend(html);
					scrollToBottom();
				}
			});
		},
		'getAllUser': function() {
			$.ajax({
				url: '/api_chatter/',
				type: 'post',
				data: {
					'action': 'get-all-user'
				},
				success: function(xhr) {
					for (var i = 0; i < xhr.users.length; i++) {
						$('#chatter-wrapper .online.users.list').append(getUserLabel(xhr.users[i]));
					}
				}
			});
		}
	};
	$('#chatter-wrapper .titlebar').click(function() {
		// $("#chatter-notebook").toggle();
		$('#chatter-wrapper').toggleClass('minimized');
		if (!$('#chatter-wrapper').hasClass('minimized')) {
			scrollToBottom();
			setTimeout(function() {
				$('#chatter-wrapper textarea').focus();
			}, 0);
		}
	});
	$('#chatter-wrapper .reply.button').click(function() {
		var content = $('#chatter-wrapper textarea').val();
		$.ajax({
			url: '/api_chatter/',
			type: 'post',
			data: {
				'action': 'send-msg',
				'content': content,
			},
			success: function(xhr) {
				var data = {
					'user_id': sessionStorage['user_id'],
					'user_name': sessionStorage['user_name'],
					'role': sessionStorage['role'],
					'content': content,
					'created_at': nowString(),
					'forum_id': $('body').attr('forum-id')
				};
				require('realtime/socket').emitChat(data);
				$('#chatter-wrapper textarea').val('');
				$('#chatter-wrapper .comments.list').append(getMsgHtml(data));
				scrollToBottom();
			}
		});
	});
	$('#chatter-wrapper textarea').keydown(function(e) {
		if (e.keyCode == 13) {
			$('#chatter-wrapper .reply.button').trigger('click');
			return false;
		}
	});

	function getUserLabel(userinfo) {
		var color = '';
		// if (userinfo.role == 'facilitator') {
		// 	color = 'blue';
		// } else if (userinfo.role == 'expert') {
		// 	color = 'yellow';
		// }
		var html = '<div class="ui image label ' + color
			+ '" data-user-id="' + userinfo.user_id + '">'
			+ userinfo.user_name
			+ '<div class="detail">' + userinfo.role.toUpperCase().charAt(0) + '</div>'
			+ '</div>';
		return html;
	}

	function getMsgHtml(msg) {
		var html = '<div class="comment"><div class="content"><div class="author">'
			+ msg.user_name + ' (' + msg.role + ')</div>'
			+ '<div class="metadata"><span class="date">'
			+ msg.created_at
			+ '</span></div><div class="text">'
			+ msg.content
			+ '</div></div></div>';
		return html;
	}

	function scrollToBottom() {
		$('.comments.segment').scrollTop($('.comments.list').height());
	}
	function nowString() {
		var date = new Date();
		var hours = date.getHours();
		var minutes = date.getMinutes();
		var ampm = hours >= 12 ? 'pm' : 'am';
		hours = hours % 12;
		hours = hours ? hours : 12; // the hour '0' should be '12'
		minutes = minutes < 10 ? '0'+minutes : minutes;
		var strTime = hours + ':' + minutes + ' ' + ampm;
		return strTime;
	}
	return module;
});