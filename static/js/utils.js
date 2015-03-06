function notify(type, message) {
	var $note = $('#popup-notification');
	$note.addClass(type).html(message).transition('fade');
	setTimeout(function() {
		$note.removeClass(type).transition('fade');
	}, 3000);
};
