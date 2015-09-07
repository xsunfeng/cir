define([
], function(
) {
	var module = {};
	module.currentCategory = null;
	module.currentTheme = null;
	$('#claim-navigator')
		.on('click', '#claim-nav-pane .claim.item', function() {
			var claim_id = this.getAttribute('data-id');
			require('claim').jumpTo(claim_id); // without changing display_type
		}).on('click', '#claim-nav-pane .refresh.item', function() {
			module.updateNavigator({'claim_only': true});
		});
	module.updateNavigator = function(options) {
		var options = options || {};
		if (options.claim_only) {
			$('#claim-nav-pane').css('opacity', '0.5');
		} else {
			$('#claim-navigator').css('opacity', '0.5');
		}
		$.ajax({
			url: '/api_get_claim/',
			type: 'post',
			data: {
				'action': 'navigator',
				'category': module.currentCategory,
				'theme': module.currentTheme,
			},
			success: function(xhr) {
				if (options.claim_only) {
					$('#claim-nav-pane').css('opacity', '1.0');
					$('#claim-nav-pane').html($(xhr.html).filter('#claim-nav-pane'));
				} else {
					$('#claim-navigator').css('opacity', '1.0');
					$('#claim-navigator').html(xhr.html);
					$('#claim-filter-pane .accordion.menu').accordion();
					initFilters();
				}
				module.setActive(require('claim').claim_id);
			},
			error: function(xhr) {
				if (options.claim_only) {
					$('#claim-nav-pane').css('opacity', '1.0');
				} else {
					$('#claim-navigator').css('opacity', '1.0');
				}
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});
	};
	module.setActive = function(claim_id) {
		if (!claim_id) {
			$('#claim-nav-pane a.item').removeClass('active');
		} else {
			$('#claim-nav-pane a.item[data-id="' + claim_id + '"]').addClass('active');
		}
	};
	module.removeItem = function(claim_id) {
		$('#claim-nav-pane a.item[data-id="' + claim_id + '"]').remove();
	};
	module.highlight = function(claim_ids) {
		$('#claim-nav-pane a.item').removeClass('highlight-found');
		if (claim_ids) {
			for (var i = 0; i < claim_ids.length; i++) {
				$('#claim-nav-pane a.item[data-id="' + claim_ids[i] + '"]').addClass('highlight-found');
			}
		}
	};
	function initFilters() {
		// initialize filters
		$('#claim-filter-pane .theme.menu').on('click', 'a.item', function() {
			if ($(this).hasClass('active')) return;
			var choice = this.getAttribute('data-value');
			if (choice == '0') {
				delete module.currentTheme;
			} else {
				module.currentTheme = choice;
			}
			require('claim').updateClaimPane();
			module.updateNavigator({'claim_only': true});
			$('#claim-filter-pane .theme.menu .item').removeClass('active');
			$(this).addClass('active');
		});
		$('#claim-filter-pane .category.menu').on('click', 'a.item', function() {
			if ($(this).hasClass('active')) return;
			var choice = this.getAttribute('data-value');
			if (choice == 'all') {
				delete module.currentCategory;
			} else {
				module.currentCategory = choice;
			}
			require('claim').updateClaimPane();
			module.updateNavigator({'claim_only': true});
			$('#claim-filter-pane .category.menu .item').removeClass('active');
			$(this).addClass('active');
		});
		//$('#claim-pane .ui.accordion').accordion({'close nested': false});
	}
	return module;
});