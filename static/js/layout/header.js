define([
	'jquery',
	'layout/cir',
], function(
	$,
	CIR
) {
	var module = {
		initHeader: function() {
			sessionStorage.clear();
			sessionStorage.setItem('user_id', $('#header-user-name').attr('data-id'));
			sessionStorage.setItem('user_name', $('#header-user-name').text());
			if ($('#header-user-name').attr('data-role')) {
				sessionStorage.setItem('role', $('#header-user-name').attr('data-role'));
			}
			$('#header-facilitator-wrapper').hide();
			$('#header-member-wrapper').hide();
			if (sessionStorage.getItem('user_id') != -1) {
				$('#header-visitor-wrapper').hide();
				$('#header-member-wrapper').show();
				if (sessionStorage.getItem('role') == 'facilitator' || sessionStorage.getItem('role') == 'admin') {
					$('#header-facilitator-wrapper').show();
					CIR.initFacilitatorBtns();
				}
			}
			CIR.initUserBtns();
		}
	};

	return module;
});

