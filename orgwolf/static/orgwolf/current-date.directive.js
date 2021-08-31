"use strict";

import "angular";

angular.module('orgwolf')
    .directive('owCurrentDate', owCurrentDate);


function owCurrentDate() {
    /*************************************************
     * Directive that lets a user change the current
     * active date for lists and inbox
     *
     **************************************************/
    // Directive creates the pieces that allow the user to edit a heading
    function link($scope, $element, attrs) {
	var $input;
	$input = $element.find('input');
	$scope.isEditable = false;
	// Set some strings for the DOM
	function set_strings(newDate) {
	    $scope.dateString = newDate.toDateString();
	    $scope.dateModel = newDate.ow_date();
	    $scope.dateModel = newDate;
	    return newDate;
	}
	// Setup the widget based on parent scope's current_date
	$scope.$watch('currentDate', function(newDate) {
	    return set_strings(newDate);
	}, true);
	// When the input loses focus, update the parent scope currentDate
	$input.on('blur', function() {
	    $scope.$apply(function() {
		var newDate;
		$scope.isEditable = false;
		newDate = new Date($scope.dateModel);
		if ( isNaN(newDate) ) {
		    // invalid date: reset values
		    set_strings($scope.currentDate);
		} else {
		    // Valid date: update parent scope (valid dates only)
		    $scope.currentDate.setDate(newDate.getUTCDate());
		    $scope.currentDate.setMonth(newDate.getUTCMonth());
		    $scope.currentDate.setYear(newDate.getUTCFullYear());
		}
	    });
	});
    }
    return {
	link: link,
	templateUrl: '/static/current-date.html',
	scope: true,
    };
}
