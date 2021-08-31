"use strict";

angular.module('orgwolf.projectOutline')
    .filter('order', order);


order = ['$sce', 'activeState'];


function order($sce, activeState) {
    /*************************************************
     * Filter that sorts top level headings in the
     * project view. (Actions list view is sorted by
     * a different filter: ``sortActions``).
     *
     **************************************************/
    return function(obj, criterion, activeHeading) {
	var ordered, i;
	if ( criterion === 'none' ) {
	    ordered = obj;
	} else {
	    ordered = obj.order_by(criterion);
	}
	// Move activeHeading tree to the top if provided
	if (activeHeading) {
	    for (i=0; i<ordered.length; i+=1) {
		if (ordered[i].tree_id === activeHeading.tree_id) {
		    // move to the top
		    ordered.unshift(ordered.splice(i, 1)[0]);
		}
	    }
	}
	return ordered;
    };
}
