"use strict";

import "angular";

angular.module("orgwolf.wolfmail")
    .filter('parent_label', parentLabel);


function parentLabel() {
    /*************************************************
     * Filter that shows a parent select option with
     *   tree indentation
     **************************************************/
    return function(parent) {
	var s, i;
	s = parent.title;
	for ( i=0; i<parent.level; i+=1 ) {
	    if ( i === 0 ) {
		// Add space between indent and title
		s = ' ' + s;
	    }
	    s = '---' + s;
	}
	return s;
    };
}
