"use strict";

import "angular";
import showdown from 'showdown';

angular.module('orgwolf.tools')
    .filter('asHtml', asHtml);


asHtml.$inject = ['$sce', '$sanitize'];


function asHtml($sce, $sanitize) {
    var converter = new showdown.Converter();
    return function(markdown) {
	var html = markdown;
	html = converter.makeHtml(html);
	html = $sce.trustAsHtml(html);
	return html;
    };
}
