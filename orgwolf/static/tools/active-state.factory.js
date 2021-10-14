"use strict";

import {module as ngModule} from 'angular';

ngModule('orgwolf.tools')
    .factory('activeState', activeState);


activeState.$inject = ['$rootScope'];


function activeState($rootScope) {
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
}
