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
			})
		});

	module.update = function(options) {
		var options = options || {};
		_stmtUpdater({'action': 'get-list'});
	};

	function initSortable() {
		if (!$('#draft-stmt ol.list').hasClass('ui-sortable')) { // only initialize once
			$('#draft-stmt ol.list').sortable({
				axis: 'y',
				helper: function(event, ui) {
					return ui.find('.description').clone();
				},
				placeholder: 'sortable-placeholder',
				stop: function(event, ui) {
					// don't trigger again if from draggable
					if ($(this).find('.claim-stmt-helper').length) {
						return;
					}
					// current elements reordered
					var orders = {};
					$(this).children().each(function(idx) {
						orders[$(this).find('.description').attr('data-id')] = idx;
					});
					_stmtUpdater({
						'action': 'reorder',
						'order': JSON.stringify(orders)
					});
				},
				receive: function(event, ui) {
					event.stopImmediatePropagation();
					// new entry added
					var claim_id = ui.sender.parents('.claim.menu').attr('data-id');
					// determine order
					var order = 0;
					$(this).children().each(function(idx) {
						if ($(this).hasClass('ui-draggable-dragging'))
							order = idx;
					});
					_stmtUpdater({
						'action': 'add-to-stmt',
						'claim_id': claim_id,
						'order': order
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