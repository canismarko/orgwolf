"use strict";

import "angular";

angular.module('orgwolf.gtd')
    .filter('secondsToString', secondsToString);


function secondsToString() {
    /*************************************************
     * Accept a number of seconds and return a HH:mm:ss
     * string.
     *
     **************************************************/
    return function(totalSeconds) {
	var hours, minutes, seconds, str;
	seconds = totalSeconds % 60;
	minutes = Math.floor(totalSeconds / 60) % 60;
	hours = Math.floor(totalSeconds / 3600);
	str = '';
	if (hours > 0) {
	    str += String(hours) + ':';
	}
	str += String(minutes) + ':';
	if (seconds < 10) {
	    str += '0';
	}
	str += String(seconds);
	return str;
    };
}
