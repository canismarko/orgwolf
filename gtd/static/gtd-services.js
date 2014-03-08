/*globals angular, GtdHeading, jQuery*/
"use strict";
var HeadingFactory;

var owServices = angular.module(
    'owServices',
    ['ngResource']
);

/*************************************************
* Factory returns an object for showing feedback
* if an operation takes a while. Visual elements
* are rendered using the waitFeedback directive.
*
**************************************************/
owServices.factory('owWaitIndicator', ['$rootScope', function($rootScope) {
    var obj, end_wait;
    // Object contains lists and accessors for those lists
    obj = {
	waitLists: {
	    'quick': [],
	    'medium': [],
	},
	start_wait: function(listName, name) {
	    obj.waitLists[listName].push(name);
	},
	end_wait: function(listName, name) {
	    // First check if the user specified all options or set defaults
	    var lists, i;
	    lists = obj.waitLists[listName];
	    if (lists === undefined) {
		// User didn't specify a list so use all
		name = listName;
		lists = [obj.waitLists.quick, obj.waitLists.medium];
	    } else {
		lists = [lists];
	    }
	    // Clear the specified wait from the lists
	    for (i=0; i<lists.length; i+=1) {
		end_wait(lists[i], name);
	    }
	},
    };
    end_wait = function(list, name) {
	// Helper function for removing items from the list
	var i;
	i = list.indexOf(name);
	while (i > -1) {
	    list.splice(i, 1);
	    i = list.indexOf(name);
	}
    };
    return obj;
}]);

/*************************************************
* Factory creates GtdHeading objects
*
**************************************************/
owServices.factory('OldHeading', ['$resource', '$http', function($resource, $http) {
    return function(data) {
        return new GtdHeading(data);
    };
}]);
owServices.factory('Heading', ['$resource', HeadingFactory]);
function HeadingFactory($resource) {
    var res = $resource(
	'/gtd/nodes/:id/',
	{id: '@id'},
	{
	    'update': {method: 'PUT'},
	    'create': {method: 'POST'},
	}
    );
    return res;
}

/*************************************************
* Default todo states. Override in template from
* server.
*
**************************************************/
owServices.value(
    'todoStatesList',
    [
	{id: 1,
	 color: {
	     red: 0,
	     green: 0,
	     blue: 0,
	     alpha: 0,
	 },
	 abbreviation: 'NEXT',
	},
	{id: 2,
	 color: {
	     red: 0,
	     green: 0,
	     blue: 0,
	     alpha: 0,
	 }
	},
    ]
);

/*************************************************
* Factory returns the request todoStates
*
**************************************************/
owServices.factory('todoStates', ['$resource', 'todoStatesList', function($resource, todoStatesList) {
    var states, TodoState;
    TodoState = $resource('/gtd/todostate/');
    states = TodoState.query();
    states = todoStatesList;
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
}]);
