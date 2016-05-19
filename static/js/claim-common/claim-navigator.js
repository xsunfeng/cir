define([
	'jquery'
], function(
	$
) {
	var module = {};
	module.currentCategory = null;
	module.currentTheme = null;
	module.activeClaimModule = null;

	module.updateNavigator = function(options) {
		var options = options || {};
		if (options.claim) {
			$('#claim-nav-pane').css('opacity', '0.5');
		}
		if (options.filter) {
			$('#claim-filter-pane').css('opacity', '0.5');
		}
		$.ajax({
			url: '/api_get_claim/',
			type: 'post',
			data: {
				'action': 'navigator',
				'category': module.currentCategory,
				'theme': module.currentTheme,
				'update_claim': options.claim,
				'update_filter': options.filter
			},
			success: function(xhr) {
				$('#claim-nav-pane').css('opacity', '1.0');
				$('#claim-filter-pane').css('opacity', '1.0');
				if (options.claim && options.filter) {
					$('#claim-navigator').html(xhr.html);
					initNav();
					initFilters();
				} else if (options.claim) {
					$('#claim-nav-pane').html($(xhr.html).children());
					initNav();
					module.setActive(module.activeClaimModule.claim_id);
				} else if (options.filter) {
					$('#claim-filter-pane').html($(xhr.html).children());
					initFilters();
				}
			},
			error: function(xhr) {
				$('#claim-nav-pane').css('opacity', '1.0');
				$('#claim-filter-pane').css('opacity', '1.0');
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

	function initNav() {
		$('#claim-nav-pane .claim.item').click(function() {
			if (module.activeClaimModule) {
				var claim_id = this.getAttribute('data-id');
				module.activeClaimModule.jumpTo(claim_id); // without changing display_type
			}
		});
		$('#claim-nav-pane .refresh.item').click(function() {
			module.updateNavigator({'claim': true});
		});
	}
	function initFilters() {
		$('#claim-filter-pane .theme.menu').click(function(e) {
			if ($(e.target).hasClass('active')) return;
			var choice = e.target.getAttribute('data-value');
			if (choice == '0') {
				delete module.currentTheme;
			} else {
				module.currentTheme = choice;
			}

			module.activeClaimModule.updateClaimPane();

			module.updateNavigator({'claim': true});
			$('#claim-filter-pane .theme.menu .item').removeClass('active');
			$(e.target).addClass('active');
		});
		$('#claim-filter-pane .category.menu').click(function(e) {
			if ($(e.target).hasClass('active')) return;
			var choice = e.target.getAttribute('data-value');
			if (choice == 'all') {
				delete module.currentCategory;
			} else {
				module.currentCategory = choice;
			}

			module.activeClaimModule.updateClaimPane();
			module.updateNavigator({'claim': true});
			$('#claim-filter-pane .category.menu .item').removeClass('active');
			$(e.target).addClass('active');
		});
	}
	return module;
});