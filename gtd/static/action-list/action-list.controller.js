"use strict";

import "angular";
import "angular-cookies";

angular.module('orgwolf.actionList')
    .controller('nextActionsList', nextActionsList);


nextActionsList.$inject = ['$sce', '$scope', '$resource', '$location', '$routeParams', '$filter', 'contexts', 'Heading', 'todoStates', 'activeState', 'owWaitIndicator', '$cookies'];


function nextActionsList($sce, $scope, $resource, $location, $routeParams, $filter, contexts, Heading, todoStates, activeState, owWaitIndicator, $cookies) {
    /*************************************************
     * Angular actions list controller
     *
     **************************************************/
    var i, TodoState, Context, today, update_url, get_list, parent_id, todo_states;
    $scope.list_params = {field_group: 'actions_list'};
    $scope.showArchived = true;
    $scope.todoStates = todoStates;
    $scope.contexts = contexts;
    $scope.activeScope = null;
    // Context filtering
    if (typeof $routeParams.context_id !== 'undefined') {
	$scope.activeContext = parseInt($routeParams.context_id, 10);
	$scope.contextName = $routeParams.context_slug;
	$scope.list_params.context = $scope.activeContext;
	contexts.$promise.then(function(contexts) {
	    var newContext = contexts.filter(function(context) {
		return context.id === $scope.activeContext;
	    })[0];
	    activeState.context = newContext;
	    // $scope.activeContext = newContext;
	    $cookies.activeContext = newContext.id;
	});
    } else {
	$scope.activeContext = null;
    }
    $scope.show_list = true;
    // Get data from url query parameters
    function getDataFromUrl() {
	$scope.parentId = $location.search().parent;
	todo_states = $location.search().todo_state;
	if ( todo_states ) {
	    // Pull from URL if provided
	    if ( !Array.isArray(todo_states) ) {
		todo_states = [todo_states];
	    }
	    // Convert strings to int
	    todo_states = todo_states.map(function(v) {
		return parseInt(v, 10);
	    });
	} else {
	    todo_states = [2];
	}
	$scope.cachedStates = todo_states.slice(0);
	$scope.activeStates = todo_states.slice(0);
	$scope.list_params.todo_state = $scope.activeStates;
    }
    getDataFromUrl();
    // Filtering by a parent Node
    $scope.$on('$routeUpdate', getDataFromUrl);
    $scope.$on('filter-parent', function(callingScope, newParentId) {
	$scope.parentId = newParentId;
	update_url($scope);
    });
    $scope.$watch('parentId', function(newParentId) {
	// Retrieve the full parent object
	if (newParentId) {
	    $scope.activeParent = Heading.get({id: newParentId});
	    $scope.activeParent.$promise.then($scope.setVisibleHeadings());
	} else {
	    $scope.activeParent = null;
	    $scope.setVisibleHeadings();
	}
    });
    // Set todoStates
    $scope.currentDate = new Date();
    $scope.$watch('currentDate', function() {
	$scope.$emit('refresh_list');
    }, true);
    // Helper function finds which upcoming and action headings to display
    $scope.setVisibleHeadings = function() {
	var currentListFilter = $filter('currentList');
	$scope.visibleHeadings = [];
	if ( $scope.upcomingList ) {
	    $scope.visibleHeadings = $scope.visibleHeadings.concat(
		$scope.upcomingList);
	    $scope.visibleHeadings = $scope.visibleHeadings.concat(
		currentListFilter($scope.actionsList,
				  $scope.activeStates,
				  $scope.upcomingList,
				  $scope.activeParent)
	    );
	}
    };
    $scope.$watchCollection('actionsList', function() {
	$scope.setVisibleHeadings();
    });
    $scope.$watchCollection('upcomingList', function() {
	$scope.setVisibleHeadings();
    });
    // Receiver that retrieves GTD lists from server
    $scope.refreshList = function() {
	var upcomingParams, $unwatch;
	// Variables for tracking status
	$scope.isLoading = true;
	owWaitIndicator.start_wait('quick', 'loadLists');
	$scope.completedRequests = [];
	$scope.actionsList = Heading.query($scope.list_params);
	upcomingParams = angular.extend(
	    {upcoming: $scope.currentDate.ow_date()},
	    $scope.list_params);
	$scope.upcomingList = Heading.query(upcomingParams);
	$scope.scheduledList = Heading.query(
	    {
		field_group: 'actions_list',
		scheduled_date__lte: $scope.currentDate.ow_date(),
		todo_state: 8
	    }
	);
	// Check for all lists to be retrieved
	$unwatch = $scope.$watch(
	    function() {
		return ($scope.actionsList.$resolved &&
			$scope.upcomingList.$resolved &&
			$scope.scheduledList.$resolved);
	    },
	    function (loadingIsComplete) {
		$scope.isLoading = !loadingIsComplete;
		if (loadingIsComplete) {
		    owWaitIndicator.end_wait('quick', 'loadLists');
		    $unwatch();
		}
	    });
    };
    $scope.$on('refresh_list', $scope.refreshList);
    $scope.$on('refresh-data', $scope.refreshList);
    // Receiver for when the active focus area changes (by clicking a tab)
    $scope.$on('focus-area-changed', function(e, newFocusArea) {
	$scope.activeFocusArea = newFocusArea;
    });
    // Todo state filtering
    $scope.toggleTodoState = function(targetState) {
	// Add or remove a TodoState from the active list
	var i = $scope.activeStates.indexOf(targetState.id);
	if ( i > -1 ) {
	    $scope.activeStates.splice(i, 1);
	} else {
	    $scope.activeStates.push(targetState.id);
	}
	update_url($scope);
    };
    $scope.$watchCollection('activeStates', function(newList, oldList) {
	var new_states, list_params;
	list_params = {};
	list_params.todo_state = newList.filter(function(state) {
	    return $scope.cachedStates.indexOf(state) === -1;
	});
	if( list_params.todo_state.length > 0 ) {
	    new_states = Heading.query(list_params);
	    new_states.$promise.then(function() {
		$scope.cachedStates = $scope.cachedStates.concat(
		    list_params.todo_state);
		$scope.actionsList = $scope.actionsList.concat(new_states);
	    });
	}
	$scope.setVisibleHeadings();
    });
    // Helper function for setting the browser URL for routing
    update_url = function(params) {
	var path, search;
	path = '/gtd/actions';
	if (params.activeContext) {
	    /*jslint regexp: true */
	    path += '/' + params.activeContext;
	    path += '/' + params.contextName
		.toLowerCase()
		.replace(/ /g,'-')
		.replace(/[^\w\-]+/g,'');
	    /*jslint regexp: false */
	}
	$location.path(path);
	search = {};
	if ($scope.parentId) {
	    search.parent = $scope.parentId;
	}
	search.todo_state = $scope.activeStates;
	$location.search(search);
    };
    // Handler for changing the context
    $scope.changeContext = function() {
	var $navButton, $navText, $navLink, newContext;
	// Get new list of headings for this context
	$scope.list_params.context = $scope.activeContext || 0;
	if ($scope.activeContext) {
	    $scope.contextName = $scope.contexts.filter(function(context) {
		return context.id === $scope.activeContext;
	    })[0].name;
	} else {
	    delete $scope.contextName;
	}
	$scope.list_params.todo_state = $scope.activeStates;
	$scope.$emit('refresh_list');
	update_url($scope);
	// Update navbar button
	$cookies.activeContext = String($scope.activeContext);
	$navButton = jQuery('#nav-actions');
	$navText = $navButton.find('.nav-text');
	$navLink = $navButton.find('a');
	newContext = $scope.contexts.filter(function(context) {
	    return context.id === $scope.activeContext;
	});
	if (newContext.length === 1) {
	    $navText.text(newContext[0].name + ' Actions');
	    activeState.context = newContext[0];
	} else {
	    $navText.text('Next Actions');
	}
	$navLink.attr('href', $location.absUrl());
    };
}
