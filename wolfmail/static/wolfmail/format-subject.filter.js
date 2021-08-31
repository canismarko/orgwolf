"use strict";

import "angular";

angular.module("orgwolf.wolfmail")
    .filter('format_subject', formatSubject);


formatSubject.$inject = ['$sce']


function formatSubject($sce) {
    /*************************************************
     * Filter that formats the "Subject" field
     **************************************************/
    return function(msg) {
	var s;
	s = '';
	if (msg.handler_path === 'plugins.deferred') {
	    // Message from a deferred Node
	    s = '<a href="/gtd/projects/#';
	    s += msg.source_node + '-';
	    s += msg.node_slug + '">';
	    s += msg.subject;
	    s += '</a>';
	    s = $sce.trustAsHtml(s);
	} else if (msg.handler_path === 'plugins.quickcapture' ) {
	    // Quick-captured message
	    s = msg.subject;
	} else {
	    s = '<a href="/wolfmail/inbox/' + msg.id + '/">';
	    s += msg.subject;
	    s += '</a>';
	}
	return s;
    };
}
