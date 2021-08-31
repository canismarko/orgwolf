"use strict";

angular.module('orgwolf.gtd')
    .filter('highlightSearchText', highlightSearchText);


function highlightSearchText() {
    /*************************************************
     * Filter takes text, trims it down then highlights
     * the matched queries.
     *
     **************************************************/
    return function(sourceText, reString) {
	var regex, workingString, firstMatch;
	// First remove html tags
	/*jslint regexp: true*/
	sourceText = String(sourceText).replace(/<[^>]+>/gm, '');
	/*jslint regexp: false*/
	// Process the string
	regex = new RegExp(reString, "ig");
	firstMatch = sourceText.search(regex);
	if (firstMatch > -1) {
	    // Truncate extra text at the front
	    if (firstMatch > 40) {
		sourceText = '&hellip;' + sourceText.slice(firstMatch-40);
	    }
	    // Restrict total length
	    if (sourceText.length > 500) {
		sourceText = sourceText.slice(0, 500);
		sourceText += '&hellip;';
	    }
	} else { // No match so return empty string
	    sourceText = '';
	}
	return sourceText;
    };
}
