"use strict";

import "angular";

angular.module("orgwolf")
    .config(addRoutes);


addRoutes.$inject = ['$routeProvider'];

function addRoutes($routeProvider) {
    /*************************************************
     * Routing for site-wide urls (account settings, etc)
     *
     **************************************************/
    $routeProvider
	.when('/accounts/settings/', {
	    templateUrl: '/static/settings.html',
	    controller: 'settings',
	})
	.when('/accounts/login/', {
	    templateUrl: '/static/orgwolf/login.html',
	    controller: 'login',
	});
}
