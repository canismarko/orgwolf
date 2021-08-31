"use strict";

import "angular";

angular.module("orgwolf.gtd")
    .factory('todoStates', todoStates);


todoStates.$inject = ['$resource'];


function todoStates($resource) {
    /*************************************************
     * Factory returns the request todoStates
     *
     **************************************************/
    var states, TodoState;
    TodoState = $resource('/gtd/todostates/');
    states = TodoState.query();
    states.getState = function(stateId) {
	var foundState, foundStates;
	foundStates = this.filter(function(obj) {
	    return obj.id === stateId;
	});
	if (foundStates.length > 0) {
	    foundState = foundStates[0];
	} else {
	    foundState = null;
	}
	return foundState;
    };
    return states;
}
