/*globals angular, GtdHeading, jQuery*/
"use strict";
var HeadingFactory, UpcomingFactory, GtdListFactory;

var owServices = angular.module(
    'owServices',
    ['ngResource']
);

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
