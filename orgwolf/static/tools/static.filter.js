"use strict";

import "angular";

angular.module("orgwolf.tools")
    .value('staticUrl', null)
    .filter('static', staticFilter);


staticFilter.$inject = ['staticUrl'];


function staticFilter(staticUrl) {
    /* Filter constructs urls for static resources */    
    return function(filename) {
	if (staticUrl !== null) {
	    filename = staticUrl + filename;
	}
	return filename;
    };
}
