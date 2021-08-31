"use strict"

import "angular";

angular.module('orgwolf.wolfmail')
    .config(addRoutes);


addRoutes.$inject = ['$routeProvider', '$locationProvider'];


function addRoutes($routeProvider, $locationProvider) {
    $locationProvider.html5Mode({enabled: true, requireBase: false});
    $routeProvider.
	when('/wolfmail/inbox/', {
	    templateUrl: '/static/inbox.html',
	    controller: 'owInbox'
	}).
	when('/wolfmail/inbox/:msg_id/', {
	    templateUrl: '/static/message.html',
	    controller: 'owMessage'
	});
}
