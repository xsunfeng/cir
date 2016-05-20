define([
	'jquery',
	'utils',
	'jquery.ui'
], function(
	$,
	Utils
) {
	var module = {};
	module.activeClaimModule = null;
	module.categories = ['finding', 'pro', 'con'];
	module.stmtLimit = {
		'finding': 10,
		'pro': 5,
		'con': 5
	};

	$('#draft-stmt').on('click', '.src_claim', function() {
		var claim_id = this.getAttribute('data-id');
		module.activeClaimModule.jumpTo(claim_id); // without changing display_type
	}).on('click', '.destmt.button', function(e) {
		e.stopPropagation();

		// since a claim can be refered by multiple slots, both claim_id and slot_id are needed
		var claim_id = $(this).parents('.src_claim').attr('data-id');
		var slot_id = $(this).parents('.slot').attr('data-id');
		_stmtUpdater({
			'action': 'destmt',
			'claim_id': claim_id,
			'slot_id': slot_id
		}).done(function() {
			$('#claim-pane-overview .claim.segment[data-id="' + claim_id + '"]').removeClass('stmt');
		});
	}).on('click', '.fullscreen.item', function() {
		module.activeClaimModule.slot_id = this.getAttribute('data-id');
		module.activeClaimModule.updateClaimPane();
	}).on('click', '.slot-title', function() {
		module.$slotTitleInput = $('<div class="slot-title-wrapper">')
			.append('<input type="text" class="slot-title-input">')
			.append('<button class="ui primary update-slot-title button">Update</button>')
			.append('<button class="ui cancel-slot-title button">Cancel</button>');
		if ($(this).hasClass('empty')) {
			module.$slotTitleInput.find('input').val('');
			module.currentSlotTitle = '';
		} else {
			module.$slotTitleInput.find('input').val($(this).text());
			module.currentSlotTitle = $(this).text();
		}
		$(this).replaceWith(module.$slotTitleInput);
		module.$slotTitleInput.find('input').select();
	}).on('click', '.slot .update-slot-title', function() {
		var newTitle = module.$slotTitleInput.find('input').val();
		$.ajax({
			url: '/api_draft_stmt/',
			type: 'post',
			data: {
				action: 'change-title',
				slot_id: $('.update-slot-title').parents('.slot').attr('data-id'),
				new_title: newTitle,
			},
			success: function() {
				var html = '<div class="slot-title">' + newTitle + '</div>';
				module.$slotTitleInput.replaceWith(html);
				delete module.$slotTitleInput;
				delete module.currentSlotTitle;
			},
		})

	}).on('click', '.slot .cancel-slot-title', function() {
		var html = '<div class="slot-title';
		if (module.currentSlotTitle == '') {
			html += ' empty">(Click to name this slot)</div>';
		} else {
			html += '">' + module.currentSlotTitle + '</div>';
		}
		module.$slotTitleInput.replaceWith(html);
		delete module.$slotTitleInput;
		delete module.currentSlotTitle;
	});

	module.initStmtHandles = function() {
		$('#claim-pane-overview .claim-addstmt-handle').mousedown(function(event) {
			var $claimsegment = $(this).parents('.claim.menu').next();
			var claimcontent = $claimsegment.find('.claim-content').text();
			module.draggingClaimId = $claimsegment.attr('data-id');
			var $helper = $('<div id="claim-stmt-helper" class="ui segment">' + claimcontent + '</div>');
			$('body').addClass('noselect');

			// place helper
			$helper
				.css('left', event.clientX)
				.css('top', event.clientY)
				.appendTo($('body'));

			// register mousemove & mouseup
			$(window)
				.mousemove(module.onDrag)
				.mouseup(module.onDragStop);
		});
	};

	module.update = function(options) {
		var options = options || {};
		_stmtUpdater({'action': 'get-list'});
	};

	module.onDrag = function(e) {
		// update helper position
		$('#claim-stmt-helper')
			.css('left', e.clientX)
			.css('top', e.clientY);

		var lists = $('#draft-stmt .list');
		module.$currentlist = null;

		for (var i = 0; i < lists.length; i ++) {
			var $target = $(lists[i]);
			var targetOffset = $target.offset();
			if (e.pageX > targetOffset.left
				&& e.pageX < targetOffset.left + $target.width()
				&& e.pageY > targetOffset.top
				&& e.pageY < targetOffset.top + $target.outerHeight()) {
				module.$currentlist = $target;
				break;
			}
		}

		if (!module.$currentlist) {
			clearDropStatus();
			return false;
		}

		var $items = module.$currentlist.children();
		var $newslot = module.$currentlist.find('.droppable-edge');

		var wrapperTop = $('#draft-stmt').offset().top;
		for (var i = 0; i < $items.length; i++) {
			var $item = $items.eq(i);
			var itemY = $item.offset().top;
			if (e.pageY >= itemY && e.pageY <= itemY + $item.height()) {
				$items.removeClass('to-drop');
				$item.addClass('to-drop');
				if ($item.hasClass('item')) {
					// merge with $item
					module.target_id = $item.find('.slot').attr('data-id');
					module.action = 'merge';
					return;
				} else if ($item.hasClass('droppable-edge')) {
					// insert new slot
					module.action = 'insert';
					module.order = i;
					return;
				}

			}
		}
	};

	module.onDragStop = function(e) {
		$('body').removeClass('noselect');
		$(window)
			.off('mousemove')
			.off('mouseup');

		$('#claim-stmt-helper').remove();

		if (module.action == 'insert') {
			var list_type = module.$currentlist.attr('data-list-type');
			_stmtUpdater({
				'action': 'initiate-slot',
				'claim_id': module.draggingClaimId,
				'order': module.order,
				'list_type': list_type
			}).done(function() {
				$('#claim-pane-overview .claim.segment[data-id="' + module.draggingClaimId + '"]').addClass('stmt');
				delete module.draggingClaimId;
			});
		} else if (module.action == 'merge') {
			_stmtUpdater({
				'action': 'add-to-slot',
				'slot_id': module.target_id,
				'claim_id': module.draggingClaimId,
			}).done(function() {
				$('#claim-pane-overview .claim.segment[data-id="' + module.draggingClaimId + '"]').addClass('stmt');
				delete module.draggingClaimId;
			});
		}
		clearDropStatus();
	};

	function clearDropStatus() {
		$('#draft-stmt .list').children()
			.removeClass('to-drop');
		delete module.order;
		delete module.action;
		delete module.target_id;
		$('#droppable-edge').remove();
	}
	function initSortable() {
		if (!$('#draft-stmt ol.list').hasClass('ui-sortable')) { // only initialize once
			$('#draft-stmt ol.list').sortable({
				axis: 'y',
				helper: function(event, ui) {
					return ui.find('.slot').clone();
				},
				handle: ".reorder-handle",
				items: '> li',
				placeholder: 'sortable-placeholder',
				stop: function(event, ui) {
					// current elements reordered
					var orders = {};
					$(this).find('.item').each(function(idx) {
						orders[$(this).find('.slot').attr('data-id')] = idx;
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
						active: '{value}/{total} slots',
						success: '{value}/{total} slots'
					}
				});
		});
	}

	function _stmtUpdater(data) {
		$('#claim-navigator').css('opacity', '0.7');
		return $.ajax({
			url: '/api_draft_stmt/',
			type: 'post',
			data: data,
			success: function(xhr) {
				$('#draft-stmt').css('opacity', '1.0');
				$('#draft-stmt').html(xhr.html);
				initSortable();
				module.stmtCount = xhr.slots_cnt;
				updateProgressBars();
			},
			error: function(xhr) {
				$('#draft-stmt').css('opacity', '1.0');
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}

	return module;
});