"use strict";

import "angular";

angular.module("orgwolf.gtd")
    .factory('focusAreas', focusAreas);


focusAreas.$inject = ['$resource', '$rootScope'];


function focusAreas($resource, $rootScope) {
    var url, params, focusAreas, i;
    url = '/gtd/focusareas/';
    params = {is_visible: true};
    focusAreas = $resource(url).query(params);
    $rootScope.$on('refresh-data', function() {
	// Remove old focus areas and replace with new ones
	focusAreas.splice(0, focusAreas.length);
	$resource(url).query(params).$promise.then(function(newFocusAreas) {
	    for(i=0; i<newFocusAreas.length; i+=1) {
		focusAreas.push(newFocusAreas[i]);
	    }
	});
    });
    return focusAreas;
}
