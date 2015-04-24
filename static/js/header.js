$(document).ready(function() {
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
			cir.initFacilitatorBtns();
		}
	}
	cir.initUserBtns();
});
var cir = {
	initUserBtns: function() {
		$('#login-btn').click(function() {
			$('#sign-in-form').modal('show');
		});
		$('#signup-btn').click(function() {
			$('#sign-up-form').modal('show');
		});
		$('#sign-out-btn').click(function() {
			$.ajax({
				url: '/api_logout/',
				type: 'post',
				complete: function() {
					$("#curr-user-name").html('');
					sessionStorage.setItem('user_id', '-1');
					sessionStorage.setItem('user_name', '');
					sessionStorage.setItem('role', 'visitor');
					$('#header-facilitator-wrapper').hide();
					$('#header-member-wrapper').hide();
					$('#header-visitor-wrapper').show();
				}
			});
		});
		$('#edit-profile-btn').click(function() {
			var $form_dlg = $('#edit-profile-form');
			var $form_profile = $form_dlg.find('.ui.form').first();
			var $form_password = $form_dlg.find('.ui.form').last();
			$.ajax({
				url: '/api_change_info/',
				type: 'post',
				data: {
					action: 'get'
				},
				success: function(xhr) {
					$form_profile.find('input[name="first-name"]').val(xhr.first_name);
					$form_profile.find('input[name="last-name"]').val(xhr.last_name);
					$form_profile.find('textarea[name="description"]').val(xhr.description);
					$form_profile.find('#email-field').text(xhr.email);
				},
				error: function(xhr) {
					$form_dlg.find('.error.message').text(xhr.responseText);
					$form_dlg.find('.ui.form').addClass('error');
				}
			});
			$form_dlg.find('.menu .item').tab();
			$form_dlg.modal('show');
			$form_profile.form({
				first_name: {
					identifier: 'first-name',
					rules: [{
						type: 'empty',
						prompt: 'Please enter your first name'
					}]
				},
				last_name: {
					identifier: 'last-name',
					rules: [{
						type: 'empty',
						prompt: 'Please enter your last name'
					}]
				}
			}, {
				onSuccess: function(e) {
					e.preventDefault();
					$('#edit-profile-submit-btn').addClass('loading');
					$.ajax({
						url: '/api_change_info/',
						data: $.extend({
							action: 'set-info'
						}, $form_profile.form('get values')),
						type: 'post',
						success: function(xhr) {
							sessionStorage.setItem('user_name', xhr.user_name);
							$('#header-user-name').text(xhr.user_name);
							$form_dlg.modal('hide');
							$('#edit-profile-submit-btn').removeClass('loading');
						},
						error: function(xhr) {
							$form_profile.find('.error.message').text(xhr.responseText);
							$form_profile.addClass('error');
							$('#edit-profile-submit-btn').removeClass('loading');
						}
					});
				}
			});
			$form_password.form({
				old_password: {
					identifier: 'old_password',
					rules: [{
						type: 'empty',
						prompt: 'Please enter a password'
					}]
				},
				new_password: {
					identifier: 'new_password',
					rules: [{
						type: 'empty',
						prompt: 'Please enter a password'
					}, {
						type: 'length[6]',
						prompt: 'Your password must be at least 6 characters'
					}, {
						type: 'match[confirm_password]',
						prompt: 'Password and confirmation should be equal'
					}]
				},
			}, {
				onSuccess: function(e) {
					e.preventDefault();
					$('#edit-profile-submit-btn').addClass('loading');
					$.ajax({
						url: '/api_change_info/',
						data: $.extend({
							action: 'set-pw'
						}, $form_password.form('get values')),
						type: 'post',
						success: function(xhr) {
							$form_dlg.modal('hide');
							$('#edit-profile-submit-btn').removeClass('loading');
						},
						error: function(xhr) {
							$form_password.find('.error.message').text(xhr.responseText);
							$form_password.addClass('error');
							$('#edit-profile-submit-btn').removeClass('loading');
						}
					});
				}
			});
		});

		$('#sign-in-form form').form({
			email: {
				identifier: 'email',
				rules: [{
					type: 'email',
					prompt: 'Please enter a valid email address'
				}]
			},
			password: {
				identifier: 'password',
				rules: [{
					type: 'empty',
					prompt: 'Please enter a password'
				}]
			},
		}, {
			onSuccess: function(e) {
				e.preventDefault();
				$('#sign-in-btn').addClass('loading');
				var $form = $('#sign-in-form form');
				$.ajax({
					url: '/api_login/',
					data: $form.form('get values'),
					type: 'post',
					success: function(xhr) {
						sessionStorage.setItem('user_id', xhr.user_id);
						sessionStorage.setItem('user_name', xhr.user_name);
						if (xhr.role) {
							sessionStorage.setItem('role', xhr.role);
						}
						$('#header-visitor-wrapper').hide();
						$('#header-member-wrapper').show();
						if (sessionStorage.getItem('role') == 'facilitator' || sessionStorage.getItem('role') == 'admin') {
							$('#header-facilitator-wrapper').show();
						}
						$('#header-user-name').text(xhr.user_name);
						$('#sign-in-form').modal('hide');
						$('#sign-in-btn').removeClass('loading');
					},
					error: function(xhr) {
						$form.find('.error.message').text(xhr.responseText);
						$form.addClass('error');
						$('#sign-in-btn').removeClass('loading');
					}
				});
			}
		});
		$('#sign-up-form form').form({
			first_name: {
				identifier: 'first-name',
				rules: [{
					type: 'empty',
					prompt: 'Please enter your first name'
				}]
			},
			last_name: {
				identifier: 'last-name',
				rules: [{
					type: 'empty',
					prompt: 'Please enter your last name'
				}]
			},
			email: {
				identifier: 'email',
				rules: [{
					type: 'email',
					prompt: 'Please enter a valid email address'
				}]
			},
			password: {
				identifier: 'password',
				rules: [{
					type: 'empty',
					prompt: 'Please enter a password'
				}, {
					type: 'length[6]',
					prompt: 'Your password must be at least 6 characters'
				}]
			},
		}, {
			onSuccess: function(e) {
				e.preventDefault();
				$('#register-btn').addClass('loading');
				var $form = $('#sign-up-form form');
				$.ajax({
					url: '/api_register/',
					data: $form.form('get values'),
					type: 'post',
					success: function(xhr) {
						sessionStorage.setItem('user_id', xhr.user_id);
						sessionStorage.setItem('user_name', xhr.user_name);
						sessionStorage.setItem('role', xhr.role);
						$('#header-visitor-wrapper').hide();
						$('#header-member-wrapper').show();
						$('#header-user-name').text(xhr.user_name);
						$('#sign-up-form').modal('hide');
						$('#register-btn').removeClass('loading');
					},
					error: function(xhr) {
						$form.find('.error.message').text(xhr.responseText);
						$form.addClass('error');
						$('#register-btn').removeClass('loading');
					}
				});
			}
		});
	},
	initFacilitatorBtns: function() {
		$('#header-facilitator-wrapper .switch.user.menu a').click(function() {
			var user_id = this.getAttribute('data-id');
			var user_name = $(this).text();
			$.ajax({
				url: '/api_register_delegator/',
				type: 'post',
				data: {
					user_id: user_id,
				},
				success: function(xhr) {
					if (user_name.indexOf(sessionStorage['user_name']) > -1) {
						// switched back!
						$('#header-user-name').text(user_name);
						delete sessionStorage['simulated_user_name'];
						delete sessionStorage['simulated_user_id'];
						delete sessionStorage['simulated_user_role'];
					} else {
						$('#header-user-name').text(user_name + ' (simulated)');
						sessionStorage['simulated_user_name'] = user_name;
						sessionStorage['simulated_user_id'] = user_id;
						sessionStorage['simulated_user_role'] = xhr.role;
					}
					window.default_claim.updateClaimPane();
				},
				error: function(xhr) {
					if (xhr.status == 403) {
						notify('error', xhr.responseText);
					}
				}
			});
		}
	}
}