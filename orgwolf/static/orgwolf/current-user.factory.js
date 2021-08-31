"use strict";

import "angular";

angular.module("orgwolf")
    .factory('currentUser', currentUser);

currentUser.$inject = ['$resource', '$rootScope'];


function currentUser($resource, $rootScope) {
    var user = $resource('/user/current/').get();
    $rootScope.$on('refresh-data', function() {
	// Retrieve the new user info and update the DOM
	$resource('/user/current/').get().$promise.then(function(newUser) {
	    angular.extend(user, newUser);
	});
    });
    return user;
}
