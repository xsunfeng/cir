define([
	'realtime/chatter',
	'doc/document',
	'doc/qa',
], function(
	Chatter,
	DocumentView,
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
		}
	};

	require([
		'socket.io'
	], function(io) {
		// load realtime module after a while
		setTimeout(function() {
			if (sessionStorage.hasOwnProperty('role') && sessionStorage['role'] !== 'visitor') {
				socket = io('127.0.0.1:443');
				socket.emit('server:user:logged_in', {
					'user_id': sessionStorage['user_id'],
					'user_name': sessionStorage['user_name'],
					'role': sessionStorage['role']
				});
			}
			initSocketEvents();

			Chatter.loadRecentHistory();
		}, 3000);

		function initSocketEvents() {
			socket
				.on('client:someone:connected', function(userinfo) {
					if (!module['online_users'].hasOwnProperty(userinfo.user_id)) {
						module['online_users'][userinfo.user_id] = userinfo;
						Chatter.addOnlineUser(userinfo);
					}
				}).on('client:someone:disconnected', function(msg) {
					var user_id = msg.user_id;
					delete module['online_users'][user_id];
					Chatter.removeOnlineUser(user_id);
				}).on('client:users:current_online', function(users) {
					for (var i = 0; i < users.length; i++) {
						if (!module['online_users'].hasOwnProperty(users[i].user_id)) {
							module['online_users'][users[i].user_id] = users[i];
							Chatter.addOnlineUser(users[i]);
						}
					}
				}).on('client:chat:emit_msg', function(msg) {
					Chatter.showMsg(msg);
				}).on('client:document:add_highlight', function(data) {
					DocumentView.receiveNewHighlight(data);
				}).on('client:document:add_question', function(data) {
					QAView.newQuestionAdded(data);
				}).on('client:qa:add_post', function(data) {
					QAView.newReplyAdded(data);
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

