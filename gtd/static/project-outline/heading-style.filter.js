"use strict";

angular.module('orgwolf.projectOutline')
    .filter('headingStyle', headingStyle);


function headingStyle() {
    /*************************************************
     * Filter that determines style of Node object
     *
     **************************************************/
    return function(obj) {
	var style, colors, color_i;
	style = '';
	// Determine color based on node.rank
	if ( obj.level > 0 ) { // Root headings style by CSS
	    colors = ['rgb(80, 0, 0)', 'rgb(0, 44, 19)',
		      'teal', 'slateblue', 'brown'];
	    color_i = (obj.level) % colors.length;
	    style += 'color: ' + colors[color_i - 1] + '; ';
	}
	return style;
    };
}
