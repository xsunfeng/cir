define([
	'realtime/chatter',
], function(
	Chatter
) {
	var socket = {
		emit: function() {
			return this;
		},
		on: function() {
			return this;
		}
	};

	var module = {
		online_users: {},
		emitChat: function(data) {
			socket.emit('server:chat:emit_msg', data);
		},
		dispatchNewHighlight: function(data) {
			socket.emit('server:document:add_highlight', data);
		},
		dispatchNewQuestion: function(data) {
			socket.emit('server:document:add_question', data);
		},
		dispatchNewPost: function(data) {
			socket.emit('server:qa:add_post', data);
		},
		updatePhase: function(data) {
			socket.emit('server:facilitation:update_phase', data);
		},
		slotChange: function(data) {
			socket.emit('server:claim:slot_change', data);
		},
		suggestStatement: function(data) {
			socket.emit('server:statement:suggest_statement', data);
		},
		editStatement: function(data) {
			socket.emit('server:statement:edit_statement', data);
		}
	};

	require([
		'socket.io'
	], function(io) {
		// load realtime module after a while
		setTimeout(function() {
			if (sessionStorage.hasOwnProperty('role') && sessionStorage['role'] !== 'visitor') {
				// hack: get server address from requirejs config
				var serverAddr = require.s.contexts._.config.paths['socket.io'].split('/')[2]
				socket = io(serverAddr);
				socket.emit('server:user:logged_in', {
					'user_id': sessionStorage['user_id'],
					'user_name': sessionStorage['user_name'],
					'role': sessionStorage['role'],
					'forum_id': $('body').attr('forum-id')
				});
				
				initSocketEvents();
				Chatter.loadRecentHistory();
			}
		}, 3000);

		function initSocketEvents() {
			socket.on('client:someone:connected', function(userinfo) {
				if (!module['online_users'].hasOwnProperty(userinfo.user_id)
					&& userinfo.forum_id == $('body').attr('forum-id')) {
					module['online_users'][userinfo.user_id] = userinfo;
					Chatter.addOnlineUser(userinfo);
				}
			}).on('client:someone:disconnected', function(msg) {
				var user_id = msg.user_id;
				delete module['online_users'][user_id];
				Chatter.removeOnlineUser(user_id);
			}).on('client:users:current_online', function(users) {
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
						for (var i = 0; i < users.length; i++) {
							if (!module['online_users'].hasOwnProperty(users[i].user_id)
								&& users[i].forum_id == $('body').attr('forum-id')) {
								module['online_users'][users[i].user_id] = users[i];
								if ($('body').attr('forum-id') == users[i].forum_id) {
									Chatter.addOnlineUser(users[i]);
								}
							}
						}
					}
				});
			}).on('client:chat:emit_msg', function(msg) {
				if ($('body').attr('forum-id') == msg.forum_id) {
					Chatter.showMsg(msg);
				}

			}).on('client:document:add_highlight', function(data) {
				if (require.defined('workbench2')) {
					require('workbench2').receiveNewHighlight(data);
				}
			}).on('client:document:add_question', function(data) {
				if (require.defined('doc/qa')) {
					require('doc/qa').newQuestionAdded(data);
				}
			}).on('client:qa:add_post', function(data) {
				if (require.defined('doc/qa')) {
					require('doc/qa').newReply(data);
				}
			}).on('client:facilitation:update_phase', function(data) {
				if ($('body').attr('forum-id') == data.forum_id) {
					var currentUrl = window.location.pathname.split('/')[1];

					var message = 'Facilitator has just changed the phase of this forum to <b>' + data.phaseFullname
						+ '</b>. Please <a href="/' + currentUrl + '/">click here</a> to go to the latest phase.';
					$('#sticked-notification').html(message).show();
				}

			}).on('client:claim:slot_change', function(data) {
				if ($('body').attr('forum-id') == data.forum_id) {
					if (require.defined('claim-common/draft-stmt')) {
						require('claim-common/draft-stmt').slotChanged(data);
					}
				}
			}).on('client:statement:suggest_statement', function(data) {
				if ($("#slot-detail[slot-id=" + data.slot_id + "]").length > 0) {
					//console.log(data.username + " is working on slot " + data.slot_id);
					var text = "Please refresh this page to receive new updates made by " + data.username;
					$("#suggest-statement-refresh").attr("slot-id", data.slot_id);
					$("#suggest-statement-refresh").text(text);
					$("#suggest-statement-refresh").show();
				}				
			}).on('client:statement:edit_statement', function(data) {
				if ($("#slot-detail[slot-id=" + data.slot_id + "]").length > 0) {
					// console.log(data.username + " is working on slot " + data.slot_id);
					if (data.status == "start") {
						var text = data.username + " is working on this statement";
						$("#edit-statement-prompt").text(text);
						$("#edit-statement-prompt").show();
					} else if (data.status == "end") {
						$("#edit-statement-prompt").hide();
					}
				}				
			});
		}
	}, function(err) {
		console.log("socket.io.js cannot be loaded");
		// socket.io.js cannot be loaded
		// fail silently and skip all socket initialization.
		if (err.requireModules && err.requireModules[0] == 'socket.io') {
			requirejs.undef('socket.io');
			$('#chatter-wrapper').addClass('disconnected');
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

	return module;
});

