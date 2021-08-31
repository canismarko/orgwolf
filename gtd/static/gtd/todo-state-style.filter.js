"use strict";

angular.module('orgwolf.gtd')
    .filter('todoStateStyle', todoStateStyle);


function todoStateStyle() {
    /*************************************************
     * Filter that determines style of TodoState object
     *
     **************************************************/
    return function(obj) {
	var style, c;
	style = '';
	if (obj === null || obj === undefined) {
	    style = null;
	} else {
	    /* Set text stylings */
	    c = obj.color;
	    style += 'color: rgba(' + c.red + ', ' + c.green + ', ';
	    style += c.blue + ', ' + c.alpha + '); ';
	}
	return style;
    };
}
