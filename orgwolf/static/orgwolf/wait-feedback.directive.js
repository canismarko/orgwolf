"use strict";

import "angular";

angular.module('orgwolf')
    .directive('owWaitFeedback', owWaitFeedback);


owWaitFeedback.$inject = ['owWaitIndicator'];


function owWaitFeedback(owWaitIndicator) {
    /*************************************************
     * Directive modifies the DOM after calls to
     * waitIndicator service
     *
     **************************************************/
    // Directive creates the pieces that allow the user to edit a heading
    function link($scope, $element, attrs) {
	$scope.short_wait = false;
	$scope.long_wait = false;
	// Respond to each waiting list by showing the appropriate setting
	$scope.$watchCollection(
	    function() { return owWaitIndicator.waitLists.quick.length; },
	    function(newLength) {
		$scope.short_wait = (newLength > 0);
	    }
	);
	$scope.$watchCollection(
	    function() { return owWaitIndicator.waitLists.medium.length; },
	    function(newLength) {
		$scope.long_wait = (newLength > 0);
	    }
	);
    }
    return {
	link: link,
	scope: {},
    };
}
