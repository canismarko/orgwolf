import jQuery from 'jquery';
import 'angular';
"use strict";

angular.module(
    'owServices',
    ['ngResource', 'toaster']
)

.factory('activeState', ['$rootScope', function($rootScope) {
    // Holds the current active objects (user, focus area, context, etc)
    var activeState = {
	user: null
    };
    $rootScope.$watch(function() {return activeState.user;}, function(newUser) {
	if (newUser) {
	    jQuery('body').removeClass('ow-logged-out');
	    jQuery('body').addClass('ow-logged-in');
	} else {
	    jQuery('body').addClass('ow-logged-out');
	    jQuery('body').removeClass('ow-logged-in');
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
