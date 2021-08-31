"use strict";

import "angular";

angular.module('orgwolf')
    .filter('toDateObj', toDateObj);


toDateObj.$inject = ['$sce'];


function toDateObj($sce) {
    /*************************************************
     * Filter that converts an ISO date string to a
     * date object.
     *
     **************************************************/
    return function(str) {
	var milliseconds, tzOffset, d;
	if( typeof str === 'string') {
	    milliseconds = Date.parse(str)
	    tzOffset = new Date().getTimezoneOffset() * 60000;
	    d = new Date(milliseconds + tzOffset);
	} else {
	    d = str;
	}
	return d;
    };
}
