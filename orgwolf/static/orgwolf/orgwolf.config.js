"use strict";

import "angular";


angular.module('orgwolf',
	       ['orgwolf.wolfmail', 'orgwolf.projectOutline', 'orgwolf.actionList',
		// 'ngAnimate', 'ngResource', 'ngCookies', 'ngRoute',
		// 'ui.bootstrap', 'ui.calendar', 'frapontillo.bootstrap-switch'
		// 'ngSanitize', 'toaster'
	       ]);


angular.module("orgwolf")
    .config(config);

config.$inject = ['$httpProvider', '$locationProvider'];


function config($httpProvider, $locationProvider) {
    // Add custom headers to $http objects
    $httpProvider.defaults.headers.common['X-Request-With'] = 'XMLHttpRequest';
    // Add django CSRF token to all $http objects
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
    // Add django CSRF token to all jQuery.ajax() requests
    function getCookie(name) {
	var cookieValue, cookies, i, cookie;
	cookieValue = null;
	if (document.cookie && document.cookie !== '') {
            cookies = document.cookie.split(';');
            for (i = 0; i < cookies.length; i += 1) {
		cookie = jQuery.trim(cookies[i]);
		// Does this cookie string begin with the name we want?
		if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(
			cookie.substring(name.length + 1)
		    );
                    break;
		}
            }
	}
	return cookieValue;
    }
    var csrftoken = getCookie('csrftoken');
    jQuery.ajaxSetup({
	beforeSend: function(xhr) {
	    xhr.setRequestHeader('X-CSRFToken', csrftoken);
	}
    });
}
