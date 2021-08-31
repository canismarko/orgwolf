"use strict";

import "angular";

angular.module('orgwolf.gtd')
    .filter('duration', duration);


function duration() {
    /*************************************************
     * Read start and end dates and determine duration
     * string.
     *
     **************************************************/
    return function(node) {
	var str, days, hours, minutes, pluralize, start, end, diff;
	// Calculate relevant duration values
	days = hours = minutes = 0;
	if (node.scheduled_time && node.end_time) {
	    start = new Date(node.scheduled_date + 'T' + node.scheduled_time);
	    end = new Date(node.end_date + 'T' + node.end_time);
	} else {
	    start = new Date(node.scheduled_date);
	    end = new Date(node.end_date);
	}
	diff = end.getTime() - start.getTime();
	days = Math.floor(diff / (1000 * 3600 * 24));
	diff = diff % (1000 * 3600 * 24);
	hours = Math.floor(diff / (1000 * 3600));
	diff = diff % (1000 * 3600);
	minutes = Math.floor(diff / (1000 * 60));
	// Construct duration string
	pluralize = function(num, singular, plural) {
	    var s = '';
	    if (num) {
		s += num + ' ';
		if (Math.abs(num) > 1) {
		    s += plural;
		} else {
		    s += singular;
		}
		s += ', ';
	    }
	    return s;
	};
	str = '';
	if (days) {
	    str += pluralize(days, 'day', 'days');
	}
	if (hours) {
	    str += pluralize(hours, 'hour', 'hours');
	}
	if (minutes) {
	    str += pluralize(minutes, 'minute', 'minutes');
	}
	// Clean up any remaining ", " at the end of the string
	str = str.substring(0, str.length-2);
	return str;
    };
}
