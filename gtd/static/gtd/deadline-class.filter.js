"use strict";

import "angular";

angular.module('orgwolf.gtd')
    .filter('deadline_class', deadlineClass);


function deadlineClass() {
    /**************************************************
     * Filters that displays the deadline for a heading
     *
     ***************************************************/
    return function(deadline, today) {
	var deadlineClass, due, deadlineDate;
	// Figure out what date we're comparing to
	if ( typeof today === 'undefined' ) {
	    today = new Date();
	}
	// Check for null values first
	if ( !deadline ) {
	    deadlineClass = '';
	} else {
	    deadlineDate = new Date(deadline);
	    due = deadlineDate - today;
	    if ( due <= 0 ) {
		deadlineClass = 'overdue';
	    } else if ( 7*86400000 > due > 0 ) {
		deadlineClass = 'upcoming';
	    }
	}
	return deadlineClass;
    }
}
