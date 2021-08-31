"use strict";

angular.module('orgwolf.projectOutline')
    .filter('is_target', isTarget);


function isTarget() {
    /*************************************************
     * Filter that determines relationship to the
     * url paramater for target node
     *
     **************************************************/
    return function(obj, active) {
	var answer = '';
	if (active) {
	    if ( obj.pk === active.id ) {
		answer = 'yes';
	    } else if ( obj.fields.tree_id === active.tree_id &&
			obj.fields.lft < active.lft &&
			obj.fields.rght > active.rght) {
		// Mark ancestors
		answer = 'ancestor';
	    }
	}
	return answer;
    };
}
