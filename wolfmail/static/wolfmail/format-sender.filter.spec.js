"use stricts";

import "angular";
import "angular-mocks";

describe('the "format_sender" filter', function() {
    var format_senderFilter;
    beforeEach(angular.mock.module('orgwolf.wolfmail'));
    beforeEach(inject(function(_format_senderFilter_) {
	format_senderFilter = _format_senderFilter_;
    }));

    it('formats a DFRD node', function() {
	var dfrdMsg = {
	    handler_path: 'plugins.deferred',
	};
	expect(format_senderFilter(dfrdMsg).toString())
	    .toEqual('<span class="dfrd">DFRD</span> Node');
    });

    it('formats a quick-capture node', function() {
	var qcMsg = {handler_path: 'plugins.quickcapture'};
	expect(format_senderFilter(qcMsg)).toEqual('Quick capture');
    });

    it('formats a generic message', function() {
	var qcMsg = {
	    sender: 'Malcolm Reynolds'
	};
	expect(format_senderFilter(qcMsg)).toEqual('Malcolm Reynolds');
    });
});
