/*globals angular, $*/
"use strict";

angular.module('owServices')
.factory('activeState', ['$rootScope', function($rootScope) {
    // Holds the current active objects (user, focus area, context, etc)
    var activeState = {
	user: null
    };
    $rootScope.$watch(function() {return activeState.user;}, function(newUser) {
	if (newUser) {
	    $('body').removeClass('ow-logged-out');
	    $('body').addClass('ow-logged-in');
	} else {
	    $('body').addClass('ow-logged-out');
	    $('body').removeClass('ow-logged-in');
	}
    });
    return activeState;
}])

.factory('currentUser', ['$resource', '$rootScope', function($resource, $rootScope) {
    var user = $resource('/user/current/').get();
    $rootScope.$on('refresh-data', function() {
	// Retrieve the new user info and update the DOM
	$resource('/user/current/').get().$promise.then(function(newUser) {
	    angular.extend(user, newUser);
	});
    });
    return user;
}]);
