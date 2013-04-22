$(document).ready(function() {
    // Rearrange to the login windows to show persona login
    var $login = $('.login');
    $login.after(
  	'<a href="#" class="persona-button"><span>Sign in with your Email</span></a>'
    );
    $btn = $login.next('a.persona-button');
    $login.remove();
    $btn.bind('click.persona', function(e) {
	navigator.id.request();
	$(this).attr('data-loading-text', 'Loading...');
    });
    $('#logout').bind('click.persona', function(e) {
	navigator.id.logout();
    });
    navigator.id.watch({
	loggedInUser: persona_user,
	onlogin: function(assertion) {
	    // A user has logged in! Here you need to:
	    // 1. Send the assertion to your backend for verification and to create a session.
	    // 2. Update your UI.
	    ow_waiting('spinner');
	    $.ajax({
		type: 'POST',
		url: '/accounts/login/persona/',
		data: {assertion: assertion},
		success: function(res, status, xhr) { 
		    res = $.parseJSON(res);
		    window.location.href = res.next;
		},
		error: function(xhr, status, err) {
		    
		    navigator.id.logout();
		    alert("Login failure: " + err);
		}
	    });
	},
	onlogout: function() {
	    // A user has logged out! Here you need to:
	    // Tear down the user's session by redirecting the user or making a call to your backend.
	    // Also, make sure loggedInUser will get set to null on the next page load.
	    // (That's a literal JavaScript null. Not false, 0, or undefined. null.)
	    $.ajax({
		type: 'POST',
		url: '/accounts/logout/persona/', // This is a URL on your website.
		success: function(res, status, xhr) {  },
		error: function(xhr, status, err) { alert("Logout failure: " + err); }
	    });
	}
    });
})
    
