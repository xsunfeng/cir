define([
	'jquery',
], function(
	$
) {
	var module = {};
	module.categories = ['finding', 'pro', 'con'];
	module.stmtLimit = {
		'finding': 10,
		'pro': 5,
		'con': 5
	};

	$('#claim-navigator')
		.on('click', '#draft-stmt .description', function() {
			var claim_id = this.getAttribute('data-id');
			require('claim/claim').jumpTo(claim_id); // without changing display_type
		}).on('click', '#draft-stmt .destmt.button', function(e) {
			e.stopPropagation();
			var claim_id = $(this).parents('.description').attr('data-id');
			_stmtUpdater({
				'action': 'destmt',
				'claim_id': claim_id
			});
		});

	module.update = function(options) {
		var options = options || {};
		_stmtUpdater({'action': 'get-list'});
	};

	module.onDrag = function(e) {
		// update helper position
		$('#claim-stmt-helper')
			.css('left', e.clientX)
			.css('top', e.clientY);

		//var setting = {};
		var $target = $('#draft-stmt .list:not(.invalid)');
		var $items = $target.find('.item');
		if ($target.length != 1) {
			return false;
		}
		var targetOffset = $target.offset();
		if (e.pageX > targetOffset.left
			&& e.pageX < targetOffset.left + $target.width()
			&& e.pageY > targetOffset.top
			&& e.pageY < targetOffset.top + $target.height()) {
			// check if on an entry or between entries
			if ($items.hasClass('empty')) {
				$items.addClass('to-drop');
				module.action = 'insert';
				module.order = 0;
			} else {
				var wrapperTop = $('#draft-stmt').offset().top;
				for (var i = 0; i < $items.length; i++) {
					var $item = $target.find('.item').eq(i);
					var itemY = $item.offset().top;
					if (e.pageY < itemY + 10) {
						// insert before this item
						$('#draft-stmt .droppable-edge')
							.css('top', itemY - wrapperTop + 14)
							.show();
						$items.removeClass('to-merge');
						module.order = i;
						module.action = 'insert';
						return;
					} else if (e.pageY >= itemY + 10
						&& e.pageY <= itemY + $item.height() - 10) {
						// merge with $item
						$('#draft-stmt .droppable-edge').hide();
						$item.addClass('to-merge');
						module.target_id = $item.find('.description').attr('data-id');
						module.action = 'merge';
						return;
					}
					if (i == $items.length - 1
						&& e.pageY > itemY + $item.height()) {
						$('#draft-stmt .droppable-edge')
							.css('top', itemY - wrapperTop + $item.height() + 14)
							.show();
						$items.removeClass('to-merge');
						module.order = i + 1;
						module.action = 'insert';
						return;
					}
				}
			}
		} else {
			clearDropStatus();
		}
	};

	module.onDragStop = function(e) {
		if (module.action == 'insert') {
			_stmtUpdater({
				'action': 'add-to-stmt',
				'claim_id': module.draggingClaimId,
				'order': module.order
			});
		} else if (module.action == 'merge') {
			// TODO mark as needs merge
			require('claim/claim').openMergeEditor(module.target_id);
		}
		$('body').removeClass('noselect');
		$(window)
			.off('mousemove')
			.off('mouseup');
		clearDropStatus();
		delete module.draggingClaimId; // source claim being dragged
		$('#claim-stmt-helper').remove();
		$('#draft-stmt ol.list').removeClass('invalid');
	};

	function clearDropStatus() {
		$('#draft-stmt .list:not(.invalid) .item')
			.removeClass('to-merge')
			.removeClass('to-drop');
		delete module.order;
		delete module.action;
		delete module.target_id;
		$('#draft-stmt .droppable-edge').hide();
	}
	function initSortable() {
		if (!$('#draft-stmt ol.list').hasClass('ui-sortable')) { // only initialize once
			$('#draft-stmt ol.list').sortable({
				axis: 'y',
				helper: function(event, ui) {
					return ui.find('.description').clone();
				},
				items: '> li',
				placeholder: 'sortable-placeholder',
				stop: function(event, ui) {
					// current elements reordered
					var orders = {};
					$(this).children().each(function(idx) {
						orders[$(this).find('.description').attr('data-id')] = idx;
					});
					_stmtUpdater({
						'action': 'reorder',
						'order': JSON.stringify(orders)
					});
				}
			});
		}
	}

	function updateProgressBars() {
		$.each(module.categories, function(idx, category) {
			$('#draft-stmt .' + category + '.stmt.progress')
				.progress({
					value: module.stmtCount[category],
					total: module.stmtLimit[category],
					text: {
						active: '{value}/{total} entries',
						success: '{value}/{total} entries'
					}
				});
		});
	}

	function _stmtUpdater(data) {
		$('#claim-navigator').css('opacity', '0.7');
		$.ajax({
			url: '/api_draft_stmt/',
			type: 'post',
			data: data,
			success: function(xhr) {
				$('#claim-navigator').css('opacity', '1.0');
				$('#claim-navigator').html(xhr.html);
				initSortable();
				module.stmtCount = xhr.claims_cnt;
				updateProgressBars();
			},
			error: function(xhr) {
				$('#claim-navigator').css('opacity', '1.0');
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}

	return module;
});