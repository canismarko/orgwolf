/*globals angular, GtdHeading, jQuery*/
"use strict";
var HeadingFactory, UpcomingFactory, GtdListFactory;

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
owServices.factory('Heading', ['$resource', '$http', HeadingFactory]);
function HeadingFactory($resource, $http) {
    var res = $resource(
	'/gtd/node/:id/',
	{id: '@id'},
	{
	    'update': {method: 'PUT'},
	    'create': {method: 'POST'},
	}
	// {
	//     'get': {
	//     	method: 'GET',
	//     	isArray: false,
	//     	transformResponse: $http.defaults.transformResponse.concat([
	//     	    function (data, headersGetter) {
	//     		var heading = new GtdHeading(angular.fromJson(data));
	//     		console.log(heading);
	//     		return heading;
	//     	    }
	//     	])
	//     },
	//     'query': {
	//     	method: 'GET',
	//     	isArray: true,
	//     	transformResponse: $http.defaults.transformResponse.concat([
	//     	    function (data) {
	//     		var i;
	//     		for (i=0; i<data.length; i+=1) {
	//     		    data[i] = new GtdHeading(angular.fromJson(data)[i]);
	//     		}
	//     		return data;
	//     	    }
	//     	])
	//     }
	// }
    );
    // // Methods added on to the resource object
    // res.prototype.is_visible = function($scope) {
    // 	// Determine if the heading is visible in the current view
    // 	var visibility, showall, active_states, active_tree, is_active, is_recent, is_closed, deadline_days, deadline_limit, is_due;
    // 	// Set defaults
    // 	if (typeof $scope === 'undefined') {
    // 	    $scope = {};
    // 	}
    // 	visibility = true; // Assume visible unless we think otherwise
    // 	// Check if this heading is within the active scope
    // 	if ( this.workspace.active_scope ) {
    // 	    if ( this.fields.scope.indexOf(this.workspace.active_scope) === -1 ) {
    // 		visibility = false;
    // 	    }
    // 	}
    // 	// Check if heading is in active todo-states
    // 	active_states = this.workspace.active_states;
    // 	if ( typeof active_states !== 'undefined' ) {
    // 	    is_active = true;
    // 	    if ( active_states.indexOf(this.fields.todo_state) === -1 ) {
    // 		is_active = false;
    // 	    }
    // 	    // If recently then show anyway
    // 	    is_recent = this.just_modified || false;
    // 	    // If deadline is coming up then show anyway
    // 	    is_closed = this.todo_state ? this.todo_state.closed : false;
    // 	    if ( this.fields.deadline_date && !is_closed ) {
    // 		deadline_days = 7;
    // 		deadline_limit = deadline_days * 24 * 60 * 60 * 1000;
    // 		is_due = ( this.due() < deadline_limit );
    // 	    } else {
    // 		is_due = false;
    // 	    }
    // 	    if ( !is_active && !is_due && !is_recent ) {
    // 		visibility = false;
    // 	    }
    // 	}
    // 	// Check archived state
    // 	if ( this.fields.archived && ! $scope.show_arx ) {
    // 	    visibility = false;
    // 	}
    // 	// Check if parent is open
    // 	if ( this.parent_obj && !this.workspace.show_list ) {
    // 	    if ( this.parent_obj.state !== 'open' ) {
    // 		visibility = false;
    // 	    }
    // 	}
    // 	// An un-saved heading is not visible
    // 	if ( this.pk === -1 ) {
    // 	    visibility = false;
    // 	}
    // 	return visibility;
    // };
    return res;
}

/*************************************************
* Factory creates resource for list of nodes with
* upcoming deadlines
*
**************************************************/
owServices.factory('Upcoming', ['$resource', '$http', UpcomingFactory]);
function UpcomingFactory($resource, $http) {
    var res = $resource(
	'/gtd/node/upcoming/',
	{},
	{
	    'update': {method: 'PUT'},
	    'create': {method: 'POST'},
	}
    );
    return res;
}

/*************************************************
* Factory creates next actions list $resource
*
**************************************************/
owServices.factory(
    'GtdList',
    ['$resource', '$http', GtdListFactory]
);
function GtdListFactory($resource, $http) {
    var res = $resource(
	'/gtd/lists/', {},
	{
	    'update': {method: 'PUT'},
	    'create': {method: 'POST'},
	}
    );
    return res;
}
