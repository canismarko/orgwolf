"use strict";

import "angular";
import "angular-resource";

angular.module('orgwolf.gtd')
    .directive('owFocusAreaTabs', owFocusAreaTabs);


owFocusAreaTabs.$inject = ['$resource', '$rootScope', '$timeout', 'focusAreas'];


function owFocusAreaTabs($resource, $rootScope, $timeout, focusAreas) {
    /*************************************************
     * Directive that shows a list of FocusArea tabs.
     * When a tab is clicked, this directive emits the
     * 'focus-area-changed' signal via the scope's $emit()
     * method with the new focus area as the first argument.
     *
     **************************************************/
    // Directive creates tabs that allow a user to filter by focus area
    function link(scope, element, attrs) {
	scope.allFocusArea = {
	    id: 0,
	    display: 'All'
	};
	scope.noneFocusArea = {
	    id: -1,
	    display: 'None'
	};
	scope.focusAreas = focusAreas;
	scope.activeFocusArea = scope.allFocusArea;
	$rootScope.activeFocusArea = scope.allFocusArea;
	$timeout(function() {
	    element.find('#fa-tab-0').find('a').addClass('active');
	});
	// Tab click handler
	scope.changeFocusArea = function(newFocusArea) {
	    // Update UI
	    element.find('#fa-tab-' + scope.activeFocusArea.id).find('a').removeClass('active');
	    scope.activeFocusArea = newFocusArea;
	    $rootScope.activeFocusArea = newFocusArea;
	    element.find('#fa-tab-' + scope.activeFocusArea.id).find('a').addClass('active');
	    // Send the relevant signals
	    $rootScope.$broadcast('focus-area-changed', newFocusArea);
	};
    }
    return {
	link: link,
	scope: {},
	templateUrl: '/static/focus-area-tabs.html'
    };
}
