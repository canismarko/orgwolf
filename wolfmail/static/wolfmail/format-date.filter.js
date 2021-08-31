"use strict";

import "angular";

angular.module("orgwolf.wolfmail")
    .filter('format_date', formatDate);


function formatDate() {
    /*************************************************
     * Filter that displays various date fields
     **************************************************/
    return function(date_str) {
	var d;
	d = new Date(date_str);
	return d.toDateString();
    };
}
