"use strict";

import "angular";

angular.module('orgwolf.projectOutline')
    .directive('owDetails', owDetails);


function owDetails() {
    /*************************************************
     * Directive that shows the details of a node
     *
     **************************************************/
    function link(scope, element, attrs) {
	// Get the full set of model fields
	scope.heading.$get()
    }
    return {
	link: link,
	scope: { heading: '=owHeading' },
	templateUrl: '/static/details.html'
    };
}
