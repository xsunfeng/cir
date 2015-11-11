define([
], function(
) {
	var module = {
		'addOnlineUser': function(userinfo) {
			$('#chatter-wrapper .online.users.list').append(getUserLabel(userinfo));
		},
		'removeOnlineUser': function(user_id) {
			$('#chatter-wrapper .online.users .label[data-user-id="' + user_id + '"]').remove();
		},
		'showMsg': function(msg) {
			$('#chatter-wrapper').transition('bounce');
			$('#chatter-wrapper .comments.list').append(getMsgHtml(msg));
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
					$('.comments.segment').scrollTop($('.comments.list').height());
				}
			});
		}
	};
	$('#chatter-wrapper .titlebar').click(function() {
		$('#chatter-wrapper').toggleClass('minimized');
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
					'created_at': nowString()
				};
				require('realtime/socket').emitChat(data);
				$('#chatter-wrapper textarea').val('');
				$('#chatter-wrapper .comments.list').append(getMsgHtml(data));
			}
		});
	});

	function getUserLabel(userinfo) {
		var color = '';
		if (userinfo.role == 'facilitator') {
			color = 'blue';
		} else if (userinfo.role == 'expert') {
			color = 'yellow';
		}
		var html = '<div class="ui image label ' + color
			+ '" data-user-id="' + userinfo.user_id + '">'
			+ userinfo.user_name
			+ '<div class="detail">' + userinfo.role + '</div>'
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