"use strict";

angular.module('orgwolf.actionList')
    .filter('actionScore', actionScore);


actionScore.$inject = ['$filter'];


function actionScore($filter) {
    /*************************************************
     * Filter that scores each action by priority
     *
     **************************************************/
    var priorities, needsActiveLocation;
    needsActiveLocation = $filter('needsActiveLocation');
    // Point values for A-B-C priorities
    var priorities = {'A': 3,
		      'B': 2,
		      'C': 1,
		      undefined: 0,
		      '': 0,
		     };
    return function(heading) {
	var today, deadline, delta, oneDay, daysLeft, points, score;
	if (heading === undefined) {
	    score = 0;
	} else {
	    score = 1;
	    oneDay = 24 * 3600 * 1000;
	    // Higher A/B/C priorities get more points
	    score += priorities[heading.priority];
	    // Upcoming deadlines get more points
	    if (heading.deadline_date) {
		today = new Date();
		// Calculate days left, from 0 up to 7.
		deadline = new Date(heading.deadline_date);
		delta = (deadline - today) / oneDay;
		daysLeft = Math.min(Math.max(delta, 0), 7);
		// Convert days left to a score to add
		points = 3 * (7 - daysLeft)/7;
		score += points;
	    }
	    // Put location-specific things higher up the list
	    if (needsActiveLocation(heading)) {
		score += 1;
	    }
	}
	return score;
    };
}
