"use strict";

import 'angular';
import 'angular-ui-bootstrap';

angular.module('owDirectives')
.directive('owRandomAction', ['$uibModal', 'Heading', '$location', '$interval', 'toaster', 'todoStates', 'priorities', '$filter', function($uibModal, Heading, $location, $interval, toaster, todoStates, priorities, $filter) {
    function link($scope, $element, attrs) {
	var randIdx, doneTodoState, dfrdTodoState, startTime, durationStop;
	var weights, totalWeight;
	// Get the DONE todoState so we can complete actions later
	doneTodoState = null;
	dfrdTodoState = null;
	for (var i=0; i<todoStates.length; i++) {
	    if (todoStates[i].abbreviation=="DONE") {
		doneTodoState = todoStates[i];
	    } else if (todoStates[i].abbreviation=="DFRD") {
		dfrdTodoState = todoStates[i];
	    }
	}
	// Handler for opening the modal dialog
	$scope.openModal = function() {
	    // Get a random item to do
	    var cumulativeWeights, rollingTotal, rand;
	    $scope.randIdx = Math.floor(Math.random() * $scope.headings.length);
	    weights = $scope.headings.map($filter('actionScore'));
	    totalWeight = weights.reduce(function(a, b) { return a+b; });
	    // Get an array of weight points between 0 and 1.
	    cumulativeWeights = []
	    rollingTotal = 0;
	    for (i=0; i<weights.length; i++) {
		rollingTotal += weights[i]
		cumulativeWeights[i] = (rollingTotal) / totalWeight;
	    }
	    // Get a random value from 0 to 1 and calculate a heading index
	    rand = Math.random();
	    rollingTotal = 0;
	    for (i=0; i<cumulativeWeights.length; i++) {
		if (rand < cumulativeWeights[i]) {
		    randIdx = i;
		    break;
		}
	    }
	    $scope.randIdx = i;
	    $scope.listHeading = $scope.headings[$scope.randIdx];
	    // Get all the data for the heading and it's parent
	    $scope.heading = Heading.get({id: $scope.listHeading.id});
	    $scope.nextHeading = $scope.heading;
	    $scope.heading.$promise.then(function(result) {
		$scope.todoState = todoStates.getState(result.todo_state);
		$scope.tags = result.tag_string.slice(1, -1).split(':');
		for (var i=0; i<priorities.length; i++) {
		    if (priorities[i].sym == result.priority) {
			$scope.priority = priorities[i];
		    }
		}
		if (result.level > 0) {
		    $scope.parentHeading = Heading.get({id: result.parent});
		} else {
		    $scope.parentHeading = null;
		}
	    });
	    // Keep track of how long we've been working on this item
	    $scope.duration = 0;
	    durationStop = $interval(function() {
		$scope.duration = Math.round((new Date() - startTime) / 1000);
	    }, 1000);
	    startTime = new Date();
	    // Load the actual modal dialog
	    $scope.actionModal = $uibModal.open({
	        ariaLabelledBy: 'modal-title',
	        ariaDescribedBy: 'modal-body',
	        templateUrl: 'random-action-modal',
	        scope: $scope,
	        appendTo: $element,
		backdrop: 'static',
	    });
	};
	// Handler for when the user wants to plan the project
	$scope.planProject = function(heading) {
	    // Redirect the brower to the projects view
	    $location.path('/gtd/projects/');
	    if ($scope.nextHeading) {
		$location.hash($scope.nextHeading.id + '-' + $scope.nextHeading.slug);
	    }
	};
	// Handler for when the user wants to defer planning a project
	$scope.planLater = function(outcome) {
	    var newFields;
	    // Create a new deferred node that lands in the inbox today
	    newFields = {
		title: 'Plan next actions for "' + $scope.nextheading.title + '"',
		archived: false,
		todo_state: dfrdTodoState.id,
		parent: $scope.nextHeading.id,
	    };
	    Heading.create(newFields).$promise.then(function(response) {
		$scope.followUpModal.dismiss('deferred');
	    });
	}
	// Handler for when the user fails to complete the action
	$scope.giveUp = function(heading) {
	    // Open the next modal for following up
	    $scope.outcome = 'failure';
	    $scope.followUp();
	};
	$scope.followUp = function() {
	    // Get rid of the old action modal
	    $interval.cancel(durationStop);
	    $scope.actionModal.dismiss($scope.outcome);
	    // Create a new modal for following up on the project
	    $scope.followUpModal = $uibModal.open({
	        ariaLabelledBy: 'modal-title',
	        ariaDescribedBy: 'modal-body',
	        templateUrl: 'follow-up-modal',
	        scope: $scope,
	        appendTo: $element,
	    });
	};
	// Prepare the handler for when the user has finished the action
	$scope.completeAction = function(heading) {
	    var oldDate;
	    $scope.outcome = 'success';
	    $scope.nextHeading = $scope.parentHeading;
	    // Update the heading on the server
	    if (heading.todo_state != doneTodoState.id) {
		heading.todo_state = doneTodoState.id;
		heading.auto_update = true;
		oldDate = heading.date;
		heading.$update()
		    .then(function(response) {
			$scope.$emit('refresh_list');
			$scope.followUp();
			if (response.data.scheduled_date !== oldDate) {
			    // Notify the user that the heading is rescheduled
			    var s = 'Rescheduled for ';
			    s += response.data.scheduled_date;
			    toaster.pop('info', null, s);
			}
		    });
	    }
	};
    }
    return {
	link: link,
	templateUrl: '/static/random-action.html',
	scope: {
	    headings: '=headings',
	}
    }
}]);

