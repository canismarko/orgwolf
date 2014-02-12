/*globals owFilters*/
"use strict";

/*************************************************
* Filter that displays the "From" field
**************************************************/
owFilters.filter('format_sender', ['$sce', function($sce) {
    return function(msg) {
	var s;
	if (msg.fields.handler_path === 'plugins.deferred') {
	    // Message from a deferred Node
	    s = '';
	    s += '<span class="dfrd">DFRD</span> Node';
	    s = $sce.trustAsHtml(s);
	} else if (msg.fields.handler_path === 'plugins.quickcapture' ) {
	    s = 'Quick capture';
	} else {
	    s = msg.fields.sender;
	}
	return s;
    };
}]);

/*************************************************
* Filter that formats the "Subject" field
**************************************************/
owFilters.filter('format_subject', ['$sce', function($sce) {
    return function(msg) {
	var s;
	s = '';
	if (msg.fields.handler_path === 'plugins.deferred') {
	    // Message from a deferred Node
	    s = '<a href="/gtd/project/#';
	    s += msg.fields.source_node + '-';
	    s += msg.fields.node_slug + '">';
	    s += msg.fields.subject;
	    s += '</a>';
	    s = $sce.trustAsHtml(s);
	} else if (msg.fields.handler_path === 'plugins.quickcapture' ) {
	    // Quick-captured message
	    s = msg.fields.subject;
	} else {
	    s = '<a href="/wolfmail/inbox/' + msg.pk + '/">';
	    s += msg.fields.subject;
	    s += '</a>';
	}
	return s;
    };
}]);

/*************************************************
* Filter that displays various date fields
**************************************************/
owFilters.filter('format_date', function() {
    return function(date_str) {
	var d;
	d = new Date(date_str);
	return d.toDateString();
    };
});

/*************************************************
* Filter that shows a parent select option with
*   tree indentation
**************************************************/
owFilters.filter('parent_label', function() {
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
});
