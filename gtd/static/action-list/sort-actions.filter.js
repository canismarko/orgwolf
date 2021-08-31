"use strict";

angular.module('orgwolf.actionList')
    .filter('sortActions', sortActions);


sortActions.$inject = ['$filter']


function sortActions($filter) {
    /*************************************************
     * Filter that sorts the action list
     *
     **************************************************/
    return function(unoderedList) {
	var actionScore, ordered;
	// Sort by "importance value" of each heading
	actionScore = $filter('actionScore');
	ordered = unoderedList.sort(function(a, b) {
	    return actionScore(b) - actionScore(a);
	});
	return ordered;
    };
}
