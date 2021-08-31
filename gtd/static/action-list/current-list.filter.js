"use strict";

angular.module('orgwolf.actionList')
    .filter('currentList', currentList);


function currentList() {
    /*************************************************
     * Filter that only shows headings that are visible
     * based on list parameters.
     *
     **************************************************/
    return function(headings, todoStates, upcomingList, activeParent) {
	var upcomingListIds;
	// Filter by todoStates
	if ( todoStates ) {
	    headings = headings.filter(function(h) {
		return todoStates.indexOf(h.todo_state) > -1;
	    });
	}
	// Remove headings that are duplicated in the upcomingList
	if ( upcomingList ) {
	    upcomingListIds = upcomingList.map(function(v) {
		return v.id;
	    });
	    headings = headings.filter(function(h) {
		return upcomingListIds.indexOf(h.id) === -1;
	    });
	}
	// Remove headings that aren't descendants of the active parent
	if ( activeParent) {
	    headings = headings.filter(function(h) {
		var isDescendant;
		if (h.tree_id === activeParent.tree_id &&
		    h.lft >= activeParent.lft &&
		    h.rght <= activeParent.rght
		   ) {
		    isDescendant = true;
		} else {
		    isDescendant = false;
		}
		return isDescendant;
	    });
	}
	return headings;
    };
}
