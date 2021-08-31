"use strict";

import "angular";

angular.module('orgwolf.gtd')
    .filter('highlightSearch', highlightSearch);


function highlightSearch() {
    /*************************************************
     * Filter takes a string and wraps the search
     * query in a span element
     *
     **************************************************/
    return function(sourceString, reString) {
	var i, regex;
	// Now apply the regular expression and wrap text
	regex = new RegExp(reString, "ig");
	sourceString = sourceString.replace(
	    regex,
	    '<span class="highlight">$&</span>'
	);
	return sourceString;
    };
}
