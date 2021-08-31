"use strict";

import "angular";

angular.module('orgwolf.gtd')
    .filter('currentFocusArea', currentFocusArea);


currentFocusArea.$inject = ['$rootScope'];


function currentFocusArea($rootScope) {
    /*************************************************
     * Filter a list (of headings) by the active
     * focus area
     *
     **************************************************/
    return function(oldList, activeFocusArea) {
	var i, newList, activeId;
	// Get id of active focus area if not supplied by caller
	if (typeof activeFocusArea === 'undefined' && $rootScope.activeFocusArea) {
	    activeId = parseInt($rootScope.activeFocusArea.id, 10);
	} else if (activeFocusArea) {
	    // Filter by the active focus area
	    activeId = parseInt(activeFocusArea.id, 10);
	} else {
	    activeId = 0;
	}
	newList = [];
	// Now do the actual filtering
	if (activeId === -1) {
	    // id of -1 mean only include headings that have no focus area
	    for (i=0; i<oldList.length; i+=1) {
		if( oldList[i].focus_areas.length === 0) {
		    // Allow only headings with no focus areas
		    newList.push(oldList.slice(i, i+1)[0]);
		}
	    }
	} else if (activeId) {
	    // Filter by an actual focus area from the database
	    for (i=0; i<oldList.length; i+=1) {
		if( oldList[i].focus_areas.indexOf(activeId) > -1 ) {
		    // Filter against an actual focus area
		    newList.push(oldList.slice(i, i+1)[0]);
		}
	    }
	} else {
	    newList = oldList.slice(0);
	}
	return newList;
    };
}
