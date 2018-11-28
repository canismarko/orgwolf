/*globals owFilters */
"use strict";

angular.module('owFilters')

.value('staticUrl', null)

/* Filter constructs urls for static resources */
.filter('static', ['staticUrl', function(staticUrl) {
    return function(filename) {
	if (staticUrl !== null) {
	    filename = staticUrl + filename;
	}
	return filename;
    };
}]);
