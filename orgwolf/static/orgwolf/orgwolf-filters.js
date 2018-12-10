import 'angular';
import 'angular-sanitize';
import 'orgwolf-services';

"use strict";

angular.module(
    'owFilters',
    ['ngSanitize', 'owServices']
)

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
