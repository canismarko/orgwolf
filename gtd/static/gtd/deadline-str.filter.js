"use strict";

import "angular";


angular.module('orgwolf.gtd')
    .filter('deadline_str', deadlineStr);


deadlineStr.$inject = ['$sce'];


function deadlineStr($sce) {
    return function(deadline, today) {
	var str, date, time_delta, day_delta;
	if ( typeof today === 'undefined' ) {
	    today = new Date();
	}
	str = '';
	if ( deadline ) {
	    str = 'Due ';
	    date = new Date(deadline + 'T12:00:00');
	    today.setHours(12, 0, 0, 0);
	    time_delta = date.getTime() - today.getTime();
	    day_delta = Math.ceil(time_delta / (1000 * 3600 * 24));
	    if ( day_delta === 0 ) {
		// Is today
		str += 'today';
	    } else if (day_delta === -1) {
		// Is yesterday
		str += 'yesterday';
	    } else if (day_delta < 0) {
		// Is farther in the past
		str += Math.abs(day_delta) + ' days ago';
	    } else if (day_delta === 1) {
		// Is tomorrow
		str += 'tomorrow';
	    } else if (day_delta > 0) {
		// Is farther in the future
		str += 'in ' + day_delta + ' days';
	    }
	}
	return str;
    };
}
