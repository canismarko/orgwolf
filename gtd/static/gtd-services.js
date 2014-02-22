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
	    console.log('started ' + name);
	    obj.waitLists[listName].push(name);
	},
	end_wait: function(listName, name) {
	    // First check if the user specified all options or set defaults
	    console.log('finished ' + listName);
	    console.log(obj.waitLists)
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
	'/gtd/node/:pk/',
	{pk: '@pk'},
	{
	    'query': {
		method: 'GET',
		transformResponse: $http.defaults.transformResponse.concat([
		    function (data, headersGetter) {
			return data;
		    }
		]),
		isArray: true
	    },
	}
    );
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
	    'query': {
		method: 'GET',
		transformResponse: $http.defaults.transformResponse.concat([
		    function (data, headersGetter) {
			return data;
		    }
		]),
		isArray: true
	    },
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
	    'query': {
		method: 'GET',
		transformResponse: $http.defaults.transformResponse.concat([
		    function (data, headersGetter) {
			var i, new_heading;
			for ( i=0; i<data.length; i+=1 ) {
			    new_heading = new GtdHeading(data[i]);
			    jQuery.extend(data[i], new_heading);
			}
			return data;
		    }
		]),
		isArray: true
	    },
	}
    );
    return res;
}
