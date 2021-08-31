"use strict";

import "angular";

angular.module("orgwolf.wolfmail")
    .filter('format_sender', formatSender);


formatSender.$inject = ['$sce'];


function formatSender($sce) {
    /*************************************************
     * Filter that displays the "From" field
     **************************************************/
    return function(msg) {
	var s;
	if (msg.handler_path === 'plugins.deferred') {
	    // Message from a deferred Node
	    s = '';
	    s += '<span class="dfrd">DFRD</span> Node';
	    s = $sce.trustAsHtml(s);
	} else if (msg.handler_path === 'plugins.quickcapture' ) {
	    s = 'Quick capture';
	} else {
	    s = msg.sender;
	}
	return s;
    };
}
