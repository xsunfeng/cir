define([
	'realtime/chatter',
	'workbench2',
	'doc/qa',
], function(
	Chatter,
	Workbench,
	QAView
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
		updatePhase: function(phase) {
			socket.emit('server:facilitation:update_phase', phase);
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
			socket
				.on('client:someone:connected', function(userinfo) {
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
					for (var i = 0; i < users.length; i++) {
						if (!module['online_users'].hasOwnProperty(users[i].user_id)
						&& users[i].forum_id == $('body').attr('forum-id')) {
							module['online_users'][users[i].user_id] = users[i];
							Chatter.addOnlineUser(users[i]);
						}
					}
				}).on('client:chat:emit_msg', function(msg) {
					if ($('body').attr('forum-id') == msg.forum_id) {
						Chatter.showMsg(msg);
					}

				}).on('client:document:add_highlight', function(data) {
					Workbench.receiveNewHighlight(data);
				}).on('client:document:add_question', function(data) {
					QAView.newQuestionAdded(data);
				}).on('client:qa:add_post', function(data) {
					QAView.newReplyAdded(data);
				}).on('client:facilitation:update_phase', function(data) {
					var message = 'Facilitator has changed the phase of this forum to <b>' + data.phase
						 + '</b>. Please refresh the page as soon as possible.';
					$('.instructions.accordion').html(message);
					$('.instructions.accordion').parent().removeClass('info').addClass('error');
				});
		}
	}, function(err) {
		// socket.io.js cannot be loaded
		// fail silently and skip all socket initialization.
		if (err.requireModules && err.requireModules[0] == 'socket.io') {
			requirejs.undef('socket.io');
			$('#chatter-wrapper').addClass('disconnected');
		}
	});
	return module;
});

