"use strict";

angular.module('orgwolf.gtd')
    .filter('decodeHtml', decodeHtml);


function decodeHtml() {
    /*************************************************
     * Filter that decodes HTML entities back into 
     * real characters. Warning: this is not safe for
     *  most purposes, it's intended for putting text
     * into a text area.
     *
     **************************************************/
    return function(html) {
	var e = document.createElement('textarea');
	e.innerHTML = html;
	// handle case of empty input
	return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
    }
}
