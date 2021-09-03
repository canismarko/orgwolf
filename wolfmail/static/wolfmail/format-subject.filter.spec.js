"use strict";

import "angular";
import "angular-mocks";

describe('the "format_subject" filter', function() {
    var format_subjectFilter;
    beforeEach(angular.mock.module('orgwolf.wolfmail'));
    beforeEach(inject(function(_format_subjectFilter_) {
	format_subjectFilter = _format_subjectFilter_;
    }));

    it('formats a quick-capture node', function() {
	var qcNode = {
	    subject: 'QC Msg',
	    handler_path: 'plugins.quickcapture'
	};
	expect(format_subjectFilter(qcNode)).toEqual('QC Msg');
    });

    it('formats a DFRD node', function() {
	var dfrdNode, subject;
	dfrdNode = {
	    subject: 'DFRD Node',
	    handler_path: 'plugins.deferred',
	    source_node: 1,
	    node_slug: 'dfrd-node',
	};
	expect(format_subjectFilter(dfrdNode).toString())
	    .toEqual('<a href="/gtd/projects/#1-dfrd-node">DFRD Node</a>');
    });

    it('formats a generic message', function() {
	var msg;
	msg = {
	    id: 1,
	    subject: 'hello, world',
	};
	expect(format_subjectFilter(msg))
	    .toEqual('<a href="/wolfmail/inbox/1/">hello, world</a>');
    });
});
