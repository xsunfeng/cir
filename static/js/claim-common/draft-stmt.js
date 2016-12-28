define([
	'jquery',
	'utils',
	'realtime/socket',
	'jquery.ui'
], function(
	$,
	Utils,
	Socket
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
		var result = confirm("Want to delete?");
		if (result) {
			// since a claim can be refered by multiple slots, both claim_id and slot_id are needed
			var claim_id = $(this).parents('.src_claim').attr('data-id');
			var slot_id = $(this).parents('.slot').attr('data-id');
			var category = $(this).parents('ol.list').attr('data-list-type');
			_stmtUpdater({
				'action': 'destmt',
				'claim_id': claim_id,
				'slot_id': slot_id
			}).done(function() {
				$('#claim-pane-overview .claim.segment[data-id="' + claim_id + '"]').removeClass('stmt');
				Socket.slotChange({
					'forum_id': $('body').attr('forum-id'),
					'category': category,
				});
				module.update_claim_usage();
			});
		}
	}).on('click', '.fullscreen.item', function() {
		module.activeClaimModule.slot_id = this.getAttribute('data-id');
		module.activeSlotId = this.getAttribute('data-id');
		module.activeClaimModule.updateClaimPane();
		$('#draft-stmt li.item').removeClass('active');
		$('#draft-stmt li.item[data-id="' + module.activeClaimModule.slot_id + '"]').addClass('active');
		$('#draft-stmt li.item').removeClass('active-1');
		$('#draft-stmt li.item[data-id="' + module.activeClaimModule.slot_id + '"]').addClass('active-1');
		$('#draft-stmt li.item').find('.fullscreen.item').removeClass('active');
		$('#draft-stmt li.item[data-id="' + module.activeClaimModule.slot_id + '"]').find('.fullscreen.item').addClass('active');
	}).on('click', '.slot-title', function() {
		module.$slotTitleInput = $('<div class="slot-title-wrapper">')
			.append('<input type="text" class="slot-title-input">')
			.append('<button class="ui primary update-slot-title button">Update</button>')
			.append('<button class="ui cancel-slot-title button">Cancel</button>');
		if ($(this).hasClass('empty')) {
			module.$slotTitleInput.find('input').val('');
			module.currentSlotTitle = '';
		} else {
			module.$slotTitleInput.find('input').val($(this).text().trim());
			module.currentSlotTitle = $(this).text().trim();
		}
		$(this).replaceWith(module.$slotTitleInput);
		module.$slotTitleInput.find('input').select();
	}).on('click', '.update-slot-title', function() {
		var newTitle = module.$slotTitleInput.find('input').val();
		$.ajax({
			url: '/api_draft_stmt/',
			type: 'post',
			data: {
				action: 'change-title',
				slot_id: $('.update-slot-title').parents('li.item').attr('data-id'),
				new_title: newTitle,
			},
			success: function() {
				var html = '<div class="slot-title">' + newTitle + '</div>';
				module.$slotTitleInput.replaceWith(html);
				delete module.$slotTitleInput;
				delete module.currentSlotTitle;
			},
		})

	}).on('click', '.cancel-slot-title', function() {
		var html = '<div class="slot-title';
		if (module.currentSlotTitle == '') {
			html += ' empty">(Click to name this slot)</div>';
		} else {
			html += '">' + module.currentSlotTitle + '</div>';
		}
		module.$slotTitleInput.replaceWith(html);
		delete module.$slotTitleInput;
		delete module.currentSlotTitle;
	}).on('click', '.stmt-refresh-category', function() {
		_stmtUpdater({
			'action': 'get-list',
			'category': $(this).parents('ol.list').attr('data-list-type'),
		});
	});

	$('#draft-stmt').on('mousedown', '.move-claim-handle', function(event) {
		var $claimsegment = $(this).parent();
		module.draggingClaimId = $claimsegment.attr('data-id');
		var $helper = $('<div id="claim-stmt-helper" class="ui segment">' + $claimsegment.html() + '</div>');
		$('body').addClass('noselect');

		// place helper
		$helper
			.css('left', event.clientX)
			.css('top', event.clientY)
			.appendTo($('body'));

		// register mousemove & mouseup
		$(window).mousemove(function(e) {
			// update helper position
			$('#claim-stmt-helper')
				.css('left', e.clientX)
				.css('top', e.clientY);
			$('#draft-stmt .phase4.slot[data-id="' + module.activeSlotId + '"]').removeClass('active');

			var slots = $('#draft-stmt .phase4.slot');
			module.$slotOnHover = null;

			for (var i = 0; i < slots.length; i ++) {
				var $target = $(slots[i]);
				var targetOffset = $target.offset();
				if (e.pageX > targetOffset.left
					&& e.pageX < targetOffset.left + $target.width()
					&& e.pageY > targetOffset.top
					&& e.pageY < targetOffset.top + $target.outerHeight()) {
					module.$slotOnHover = $target;
					break;
				}
			}
			$('#draft-stmt .phase4.slot').removeClass('to-drop');
			if (!module.$slotOnHover) {
				return false;
			}

			module.$slotOnHover.addClass('to-drop');
		}).mouseup(function(e) {
			if (module.$slotOnHover) {
				module.$slotOnHover.removeClass('to-drop');
			}
			$('body').removeClass('noselect');
			$(window)
				.off('mousemove')
				.off('mouseup');

			$('#claim-stmt-helper').remove();

			if (module.$slotOnHover) {
				_stmtUpdater({
					'action': 'move-to-slot',
					'from_slot_id': module.activeSlotId,
					'to_slot_id': module.$slotOnHover.attr('data-id'),
					'claim_id': module.draggingClaimId,
				}).done(function() {
					delete module.draggingClaimId;
					delete module.activeSlotId;
				});
			} else {
				$('#draft-stmt .phase4.slot[data-id="' + module.activeSlotId + '"]').addClass('active');
				delete module.draggingClaimId;
				delete module.activeSlotId;
			}
		});
	});

	module.initStmtHandles = function() {
		$('#claim-pane-overview .claim-addstmt-handle').mousedown(function(event) {
			var $claimsegment = $(this).parents('.claim.menu').next();
			var claimcontent = $claimsegment.find('.claim-content').text().trim();
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
				.mousemove(onDrag)
				.mouseup(onDragStop);
		});
	};

	module.update = function(options) {
		var options = options || {};
		_stmtUpdater({'action': 'get-list'});
	};

	module.slotChanged = function(data) {
		var message = 'Slot order and/or claim assignment has changed under this category. Please <a class="stmt-refresh-category">click here</a> to refresh.';
		$('#draft-stmt ol.list[data-list-type="' + data.category + '"] .message').html(message).show();
	};

	function onDrag(e) {
		// update helper position
		$('#claim-stmt-helper')
			.css('left', e.clientX)
			.css('top', e.clientY);

		var lists = $('#draft-stmt .list');
		module.$listOnHover = null;

		for (var i = 0; i < lists.length; i ++) {
			var $target = $(lists[i]);
			var targetOffset = $target.offset();
			if (e.pageX > targetOffset.left
				&& e.pageX < targetOffset.left + $target.width()
				&& e.pageY > targetOffset.top
				&& e.pageY < targetOffset.top + $target.outerHeight()) {
				module.$listOnHover = $target;
				break;
			}
		}

		if (!module.$listOnHover) {
			clearDropStatus();
			return false;
		}

		var $items = module.$listOnHover.children();
		var $newslot = module.$listOnHover.find('.droppable-edge');

		var wrapperTop = $('#draft-stmt').offset().top;
		for (var i = 0; i < $items.length; i++) {
			var $item = $items.eq(i);
			var itemY = $item.offset().top;
			if (e.pageY >= itemY && e.pageY <= itemY + $item.height()) {
				$items.removeClass('to-drop');
				$item.addClass('to-drop');
				if ($item.hasClass('item')) {
					// merge with $item
					module.target_id = $item.attr('data-id');
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
	}

	function onDragStop(e) {
		$('body').removeClass('noselect');
		$(window)
			.off('mousemove')
			.off('mouseup');

		$('#claim-stmt-helper').remove();

		if (!module.$listOnHover) return;

		var list_type = module.$listOnHover.attr('data-list-type');
		if (module.action == 'insert') {
			_stmtUpdater({
				'action': 'initiate-slot',
				'claim_id': module.draggingClaimId,
				'order': module.order,
				'list_type': list_type
			}).done(function(xhr) {
				$claim = $('#claim-pane-overview .claim.segment[data-id="' + module.draggingClaimId + '"]');
				$claim.addClass('stmt');
				$('#claim-pane-overview .claim.segment[data-id="' + module.draggingClaimId + '"]')
				delete module.draggingClaimId;
				Socket.slotChange({
					'forum_id': $('body').attr('forum-id'),
					'category': list_type,
				});
				module.update_claim_usage();
				// phase 3, open workspace after drop
				$(".show-workspace[data-id=" + xhr.slot_id + "]").click();
			});
		} else if (module.action == 'merge') {
			_stmtUpdater({
				'action': 'add-to-slot',
				'slot_id': module.target_id,
				'claim_id': module.draggingClaimId,
			}).done(function(xhr) {
				$claim = $('#claim-pane-overview .claim.segment[data-id="' + module.draggingClaimId + '"]');
				$claim.addClass('stmt');
				delete module.draggingClaimId;
				Socket.slotChange({
					'forum_id': $('body').attr('forum-id'),
					'category': list_type,
				});
				module.update_claim_usage();
				// phase 3, open workspace after drop
				$(".show-workspace[data-id=" + xhr.slot_id + "]").click();
			});
		}
		clearDropStatus();
	}

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
					return ui.clone();
				},
				handle: ".reorder-handle",
				items: '> li',
				placeholder: 'sortable-placeholder',
				stop: function(event, ui) {
					// current elements reordered
					var orders = {};
					$(this).find('li.item').each(function(idx) {
						orders[$(this).attr('data-id')] = idx;
					});
					var category = this.getAttribute('data-list-type');
					_stmtUpdater({
						'action': 'reorder',
						'order': JSON.stringify(orders)
					}).done(function() {
						Socket.slotChange({
							'forum_id': $('body').attr('forum-id'),
							'category': category,
						});
					});
				}
			});
		}
	}

	function updateProgressBars() {
		$.each(module.categories, function(idx, category) {
			var value = module.stmtCount[category];
			var total = module.stmtLimit[category];
			if (value > total) {
				$('#draft-stmt .' + category + '.stmt.progress').attr('data-percent', '100');
			}
			$('#draft-stmt .' + category + '.stmt.progress')
				.progress({
					value: value,
					total: total,
					text: {
						active: '{value}/{total} slots',
						success: '{value}/{total} slots'
					}
				});
		});
	}

	function _stmtUpdater(data) {
		return $.ajax({
			url: '/api_draft_stmt/',
			type: 'post',
			data: data,
			success: function(xhr) {
				$('#my-statement').html(xhr.my_statement);
				$('#draft-stmt').css('opacity', '1.0');
				if (data.category) {
					$('#draft-stmt ol.list[data-list-type="' + data.category + '"]')
						.html($(xhr.html).filter('ol.list[data-list-type="' + data.category + '"]').html());
					module.stmtCount[data.category] = xhr.slots_cnt[data.category];
				}	else {
					$('#draft-stmt').html(xhr.html);
					module.stmtCount = xhr.slots_cnt;
				}

				if (module.activeSlotId) {
					$('#draft-stmt .phase4.slot[data-id="' + module.activeSlotId + '"]').addClass('active');
				}
				initSortable();
				updateProgressBars();
				module.update_claim_usage();
			},
			error: function(xhr) {
				$('#draft-stmt').css('opacity', '1.0');
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	}

	module.update_claim_usage = function() {
		var claim_to_slot_hash = {};
		var slot_types = ["finding", "pro", "con"];
		for (var i in slot_types) {
			var slot_type = slot_types[i];
			for (var i = 0; i < $('.list[data-list-type="'+ slot_type +'"] .item.slot').length; i++) {
				var slot = $('.list[data-list-type="'+ slot_type +'"] .item.slot')[i];
				var slot_order = i + 1;
				var slot_id = $(slot).attr("data-id");
				for (var j = 0; j < $(slot).find(".src_claim").length; j++) {
					var claim = $(slot).find(".src_claim")[j];
					var claim_id = $(claim).attr("data-id");
					if (claim_to_slot_hash[claim_id] === undefined) claim_to_slot_hash[claim_id] = [];
					var html = '<a href="#" class="toslot" slot-id=' + slot_id +'>' + slot_type + slot_order + '</a>';
					claim_to_slot_hash[claim_id].push(html);
				}
			}
		}
		for (var i = 0; i < $(".claim.stmt").length; i++) {
			var claim = $(".claim.stmt")[i];
			$(claim).find(".slot-assignment").empty();
			var claim_id = $(claim).attr("data-id");
			if (claim_id in claim_to_slot_hash) {
				var html = '<i class="warning sign icon"></i>This claim has been categorized into: ';
				for (var j = 0; j < claim_to_slot_hash[claim_id].length; j++){
					html += claim_to_slot_hash[claim_id][j];
					if (j != claim_to_slot_hash[claim_id].length - 1) html += ", ";
				}	
				$(claim).find(".slot-assignment").append(html);				
			}
		}
	}

	return module;
});