"use strict";

angular.module('orgwolf.gtd')
    .filter('listFocusAreas', listFocusAreas);


listFocusAreas.$inject = ['focusAreas'];


function listFocusAreas(focusAreas) {
    /*************************************************
     * Filter accepts a heading and returns a string of
     * its focus areas
     *
     **************************************************/
    return function(heading) {
	var s, f, i, fa, activeFocusAreas, areaName;
	// Build list of focus area names
	activeFocusAreas = [];
	f = function(fa) {return fa.id === heading.focus_areas[i];};
	for (i=0; i<heading.focus_areas.length; i+=1) {
	    areaName = focusAreas.filter(f)[0];
	    activeFocusAreas.push(areaName);
	}
	// Combine focus area names into a string
	s = '';
	for (i=0; i<activeFocusAreas.length; i+=1) {
	    fa = activeFocusAreas[i];
	    if (i===0) {
		// First entry
		s += fa.display;
	    } else if (i===(activeFocusAreas.length-1) &&
		       activeFocusAreas.length > 1) {
		// Last entry
		s += ' and ' + fa.display;
	    } else {
		// All other entries
		s += ', ' + fa.display;
	    }
	}
	return s;
    };
}
