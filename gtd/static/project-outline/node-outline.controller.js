"use strict";

import 'angular';

angular.module('orgwolf.projectOutline')
    .controller('nodeOutline', nodeOutline);


nodeOutline.$inject = ['$scope', '$rootScope', '$http', '$resource', '$filter', 'Heading', '$location', '$anchorScroll', 'owWaitIndicator', 'activeHeading', 'openReview'];


function nodeOutline($scope, $rootScope, $http, $resource, $filter, Heading, $location, $anchorScroll, owWaitIndicator, activeHeading, openReview) {
    /*************************************************
     * Angular project ouline appliance controller
     *
     **************************************************/
    var TodoState, Scope, url, get_heading, Parent, Tree, parent_tree_id, parent_level, target_headings, targetId, main_headings, newButton, showAllButton;
    newButton = jQuery('#add-heading');
    showAllButton = jQuery('#show-all-btn');
    $scope.openReview = openReview;
    // Check if the user is requesting a specific node in the URL
    activeHeading.activate($location.hash().split('-')[0]);
    $scope.activeHeading = activeHeading;
    // Get all the top-level projects
    $scope.getChildren = function() {
	$scope.children = Heading.query({'parent_id': 0,
					 'archived': false,
					 'field_group': 'outline'});
    };
    $scope.getChildren();
    $scope.toggleHeading = function(state) {
	// No-op to avoid "function not found" error
    };
    $scope.activeScope = null;
    $scope.sortField = 'title';
    $scope.sortFields = [
	{key: 'title', display: 'Title'},
	{key: '-title', display: 'Title (reverse)'},
	{key: '-opened', display: 'Creation date'},
	{key: 'opened', display: 'Creation date (oldest first)'},
    ];
    // Get id of parent heading
    if ($scope.parent_id === '') {
	$scope.parent_id = 0;
    } else {
	$scope.parent_id = parseInt($scope.parent_id, 10);
    }
    $rootScope.showArchived = false;
    // If a parent node was passed
    if ( $scope.parent_id ) {
	target_headings = Heading.query({'tree_id': parent_tree_id,
					 'level__lte': parent_level + 1});
	$scope.headings.add(target_headings);
	// Recurse through and open all the ancestors of the target heading
	target_headings.$promise.then(function() {
	    var target, open;
	    target = $scope.headings.get({pk: $scope.parent_id});
	    open = function(child) {
		var parent;
		child.toggle('open');
		child.update();
		parent = child.get_parent();
		if ( parent.rank !== 0 ) {
		    open(parent);
		}
	    };
	    if ( target.fields.archived ) {
		$rootScope.showArchived = true;
	    }
	    open(target);
	    target.editable = true;
	});
    }
    // Handler for toggling archived nodes
    $scope.showAll = function(e) {
	var arx_headings;
	$rootScope.showArchived = !$rootScope.showArchived;
	showAllButton.toggleClass('active');
	// Fetch archived nodes if not cached
	if ( ! $scope.arx_cached ) {
	    arx_headings = Heading.query({'parent_id': 0,
					   'archived': true});
	    arx_headings.$promise.then(function() {
		$scope.children = $scope.children.concat(arx_headings);
	    });
	    $scope.arx_cached = true;
	}
	// Broadcast to all child nodes that archived nodes should be shown
	$scope.$broadcast('toggle-archived', $rootScope.showArchived);
    };
    // Handler for adding a new project
    $scope.addProject = function(e) {
	var $off;
	$scope.newProject = !$scope.newProject;
	newButton.toggleClass('active');
	$off = $scope.$on('finishEdit', function(e, newHeading) {
	    e.stopPropagation();
	    $scope.newProject = false;
	    newButton.removeClass('active');
	    if ( newHeading ) {
		// Re-sort list then add new heading
		$scope.sortFields.unshift({key: 'none', display: 'None'});
		$scope.children = $filter('order')($scope.children, $scope.sortField);
		$scope.sortField = 'none';
		$scope.children.unshift(newHeading);
	    }
	    $off();
	});
    };
    // Respond to refresh-data signals (logging in, etc)
    $scope.$on('refresh-data', $scope.getChildren);
    // Handler for changing the focus area
    $scope.$on('focus-area-changed', function(e, newFocusArea) {
	$scope.activeFocusArea = newFocusArea;
    });
}
