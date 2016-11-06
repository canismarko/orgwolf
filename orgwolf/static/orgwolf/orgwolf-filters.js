/*globals owFilters */
"use strict";

owFilters.value('staticUrl', null);

/* Filter constructs urls for static resources */
owFilters.filter('static', ['staticUrl', function(staticUrl) {
    return function(filename) {
	if (staticUrl !== null) {
	    filename = staticUrl + filename;
	}
	return filename;
    };
}]);
