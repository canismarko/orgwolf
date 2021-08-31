"use strict";

import 'angular';

angular.module('orgwolf.gtd')
    .config(addRoutes);


addRoutes.$inject = ['$routeProvider', '$locationProvider'];


function addRoutes($routeProvider, $locationProvider) {
    /*************************************************
     * Angular routing
     *
     **************************************************/
    $locationProvider.html5Mode({enabled: true, requireBase: false});
    $routeProvider
	.when('/gtd/actions/:context_id?/:context_slug?', {
	    templateUrl: '/static/actions-list.html',
	    controller: 'nextActionsList',
	    reloadOnSearch: false,
	})
	.when('/gtd/projects/', {
	    templateUrl: '/static/project-outline.html',
	    controller: 'nodeOutline'
	})
	.when('/search/', {
	    templateUrl: '/static/search-results.html',
	    controller: 'search'
	})
	.when('/calendar/', {
	    templateUrl: '/static/calendar.html',
	    controller: 'calendar'
	})
	.when('/', {
	    redirectTo: '/gtd/projects/'
	});
}
