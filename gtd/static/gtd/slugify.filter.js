"use strict";

angular.module('orgwolf.gtd')
    .filter('slugify', slugify);


function slugify() {
    /*************************************************
     * Filter turns a string into a slug
     *
     **************************************************/
    return function(string) {
	var s;
	if (string !== undefined) {
	    /*jslint regexp: true */
	    s = string.toLowerCase().replace(/[^a-z_]/g, '-');
	    /*jslint regexp: false */
	}
	return s;
    };
}
