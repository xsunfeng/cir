var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

/**
 * socketIds: maintain a list of currently online user info
 */
var socketIds = [];

io.on('connection', function(socket) {
	socket
		.on('server:user:logged_in', function(msg) {
			console.log(msg.role + ' connected as ' + socket.id + ' joined forum ' + msg.forum_id);

			// join a room according to their role
			socket.join(msg.role);

			// join socketIds
			socketIds.push({
				'user_id': msg.user_id,
				'user_name': msg.user_name,
				'role': msg.role,
				'socket_id': socket.id,
				'forum_id': msg.forum_id,
			});

			// notify others
			socket.broadcast.emit('client:someone:connected', {
				'user_id': msg.user_id,
				'user_name': msg.user_name,
				'role': msg.role,
				'socket_id': socket.id,
				'forum_id': msg.forum_id
			});

			// return current online users
			socket.emit('client:users:current_online', socketIds);
		}).on('disconnect', function() {
			console.log('user disconnected: ' + socket.id);
			for (var i = 0; i < socketIds.length; i++) {
				if (socketIds[i].socket_id == socket.id) {

					socketIds.slice(i, 1);
					socket.broadcast.emit('client:someone:disconnected', {
						'user_id': socketIds[i].user_id
					});
					break;
				}
			}
		}).on('server:chat:emit_msg', function(msg) {
			// except sender
			socket.broadcast.emit('client:chat:emit_msg', msg);
		}).on('server:document:add_highlight', function(data) {
			// except sender
			socket.broadcast.emit('client:document:add_highlight', data);
		}).on('server:document:add_question', function(data) {
			// except sender
			socket.broadcast.emit('client:document:add_question', data);
		}).on('server:qa:add_post', function(data) {
			// except sender
			socket.broadcast.emit('client:qa:add_post', data);
		}).on('server:facilitation:update_phase', function(data) {
			// except sender
			socket.broadcast.emit('client:facilitation:update_phase', data);
		});



	//// sending to sender-client only
	//socket.emit('message', "this is a test");
	//
	//// sending to all clients, include sender
	//io.emit('message', "this is a test");
	//
	//// sending to all clients except sender
	//socket.broadcast.emit('message', "this is a test");
	//
	//// sending to all clients in 'game' room(channel) except sender
	//socket.broadcast.to('game').emit('message', 'nice game');
	//
	//// sending to all clients in 'game' room(channel), include sender
	//io.in('game').emit('message', 'cool game');
	//
	//// sending to sender client, only if they are in 'game' room(channel)
	//socket.to('game').emit('message', 'enjoy the game');
	//
	//// sending to all clients in namespace 'myNamespace', include sender
	//io.of('myNamespace').emit('message', 'gg');
	//
	//// sending to individual socketid
	//socket.broadcast.to(socketid).emit('message', 'for your eyes only');
});
server.listen(443);