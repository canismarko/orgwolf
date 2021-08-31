"use strict";

import "angular";

angular.module('orgwolf.gtd')
    .directive('owTodo', owTodo);


owTodo.$inject = ['$rootScope', '$filter', 'todoStates', 'toaster'];


function owTodo($rootScope, $filter, todoStates, toaster) {
    /*************************************************
     * Directive that lets a user change the todo state
     * with a popover menu
     **************************************************/
    // Directive creates the pieces that allow the user to edit a heading
    function link(scope, element, attrs) {
	var i, $span, $popover, $options, state, content, s, isInitialized;
	element.addClass("todo-state-widget");
	scope.todoState = todoStates.getState(scope.heading.todo_state);
	scope.todoStates = todoStates;
	scope.todoStateId = scope.heading.todo_state;
	scope.$watch('todoStateId', function(newStateId, oldStateId) {
	    // When the todoStateId changes (by user action)
	    if (newStateId !== scope.heading.todo_state) {
		var oldDate;
		scope.heading.todo_state = parseInt(newStateId, 10);
		scope.todoState = todoStates.getState(scope.heading.todo_state);
		scope.heading.auto_update = true;
		oldDate = scope.heading.scheduled_date;
		scope.heading.$update()
		    .then(function(response) {
			if (scope.todoState != null) {
			    scope.$emit('finishEdit', response.data,
					scope.todoState.closed);
			}
			if (response.data.scheduled_date !== oldDate) {
			    // Notify the user that the heading is rescheduled
			    var s = 'Rescheduled for ';
			    s += response.data.scheduled_date;
			    toaster.pop('info', null, s);
			}
		    });
	    }
	});
	scope.$watch(
	    function() { return scope.heading.todo_state; },
	    function(newHeadingStateId) {
		// Update the model if the active todo state is
		// changed programatically
		if (newHeadingStateId !== scope.todoStateId) {
		    scope.todoState = todoStates.getState(scope.heading.todo_state);
		    scope.todoStateId = String(newHeadingStateId);
		}
		// Attach a tooltip with the states text
		if (scope.todoState) {
		    element.tooltip({
			delay: {show:1000, hide: 100},
			title: scope.todoState.display_text,
		    });
		}
	    }
	);
    }
    return {
	link: link,
	scope: {
	    heading: '=owHeading'
	},
	templateUrl: '/static/todo-state-selector.html',
    };
}
