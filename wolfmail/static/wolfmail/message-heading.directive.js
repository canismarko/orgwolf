"use strict";

import "angular";

angular.module("orgwolf.wolfmail")
    .directive('owMessageHeading', owMessageHeading);


owMessageHeading.$inject = ['todoStates'];


function owMessageHeading(todoStates) {
    /*************************************************
     * Directive for showing the Headings that are
     * descended from a message.
     *   eg. Message --> new task (Heading)
     **************************************************/
    function link(scope, element, attrs) {
	scope.isEditable = false;
	scope.$on('finishEdit', function() {
	    scope.isEditable = false;
	});
	scope.$watch('heading.todo_state', function(newStateId) {
	    if ( newStateId) {
		scope.todoState = todoStates.filter(function(state) {
		    return state.id === newStateId;
		})[0];
	    } else {
		scope.todoState = null;
	    }
	});
    }
    return {
	scope: false,
	link: link,
    };
}
