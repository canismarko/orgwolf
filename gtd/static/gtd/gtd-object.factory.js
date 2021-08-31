"use strict";

import "angular";

angular.module("orgwolf.gtd")
    .factory('GtdObject', GtdObject);


GtdObject.$inject = ['$resource', '$rootScope'];


function GtdObject($resource, $rootScope) {
    return function(url, params) {
	var objs
	objs = $resource(url).query(params);
	$rootScope.$on('refresh-data', function() {
	    // Remove old objects and replace with new ones
	    contexts.splice(0, objs.length);
	    $resource(url).query(params).$promise.then(function(newObjs) {
		for(i=0; i<newObjs.length; i+=1) {
		    objs.push(newObjs[i]);
		}
	    });
	});
	return objs;
    };
}
