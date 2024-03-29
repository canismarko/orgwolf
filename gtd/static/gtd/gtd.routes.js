"use strict";

import { module as ngModule } from 'angular';

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
	.when('/gtd/review/', {
	    template: "<ow-weekly-review></ow-weekly-review>\n",
	    // controller: 'weeklyReview',
	})
	.when('/gtd/actions/:context_id?/:context_slug?', {
	    templateUrl: '/static/action-list/action-list.html',
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
