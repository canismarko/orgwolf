"use strict";

angular.module('orgwolf.gtd')
    .filter('needsActiveLocation', needsActiveLocation);


needsActiveLocation.$inject = ['activeState', 'locations'];


function needsActiveLocation(activeState, locations) {
    /*************************************************
     * Filter that determines if the heading needs the
     * current active loation
     *
     **************************************************/
    return function(heading) {
	var activeLocations, locationIDs, i, activeLocation, inActiveLocation;
	// Get active locations for sorting based on active context
	activeLocations = [];
	inActiveLocation = false;
	if (activeState.context) {
	    locationIDs = activeState.context.locations_available;
	    for (i=0; i<locationIDs.length; i+=1) {
		// Find and check each location object
		activeLocation = locations.filter(function(loc) {
		    return loc.id == locationIDs[i];
		})[0];
		activeLocations.push(activeLocation);
	    }
	}
	// Put location-specific things higher up the list
	for (i=0; i<activeLocations.length; i+=1) {
	    activeLocation = activeLocations[i];
	    if (heading.tag_string.indexOf(activeLocation.tag_string) > -1) {
		// This heading requires the current location tag
		inActiveLocation = true
		break;
	    }
	}
	return inActiveLocation;
    };
}
