"use strict";

import { module as ngModule } from 'angular';
import { Notyf } from "notyf";

ngModule('orgwolf.weeklyReview')
    .controller('weeklyReview', weeklyReview);


weeklyReview.$inject = ['$scope', "WeeklyReview", "openReview", "activeReview"];


function weeklyReview($scope, weeklyReview, openReview, activeReview) {
    /*************************************************
     * Weekly review controller
     *
     **************************************************/
    const notyf = new Notyf();
    // Set default values
    $scope.activeReview = activeReview;
    $scope.openReview = openReview;
    // Limits on how many tasks can be in each category
    $scope.taskLimits = {
	"primary": 5,
	"secondary": 5,
	"tertiary": 5,
	"extra": 0,
    }
    // State objects to determine whether the open review lists are valid
    $scope.listIsValid = {
	"primary": false,
	"secondary": false,
	"tertiary": false,
	"extra": false,
    }
    function setupWatch(listName) {
	// Update the state object based on the length of the list
	let varName = "openReview." + listName + "_tasks.length";
	$scope.$watch(varName, function(listLength) {
	    $scope.listIsValid[listName] = (listLength <= $scope.taskLimits[listName]);
	});
    }
    setupWatch("primary");
    setupWatch("secondary");
    setupWatch("tertiary");
    setupWatch("extra");
}
