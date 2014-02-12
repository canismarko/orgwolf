describe('filters in wolfmail-filters.js:', function() {

    describe('the "format_sender" filter', function() {
	var format_senderFilter;
	beforeEach(module('owFilters'));
	beforeEach(inject(function(_format_senderFilter_) {
	    format_senderFilter = _format_senderFilter_;
	}));

	it('formats a DFRD node', function() {
	    var dfrdMsg = {
		fields: {
		    handler_path: 'plugins.deferred',
		},
	    };
	    expect(format_senderFilter(dfrdMsg).toString())
		.toEqual('<span class="dfrd">DFRD</span> Node');
	});

	it('formats a quick-capture node', function() {
	    var qcMsg = {
		fields: { handler_path: 'plugins.quickcapture' }
	    };
	    expect(format_senderFilter(qcMsg)).toEqual('Quick capture');
	});

	it('formats a generic message', function() {
	    var qcMsg = {
		fields: { sender: 'Malcolm Reynolds' }
	    };
	    expect(format_senderFilter(qcMsg)).toEqual('Malcolm Reynolds');
	});
    });

    describe('the "format_subject" filter', function() {
	var format_subjectFilter;
	beforeEach(module('owFilters'));
	beforeEach(inject(function(_format_subjectFilter_) {
	    format_subjectFilter = _format_subjectFilter_;
	}));

	it('formats a quick-capture node', function() {
	    var qcNode = {
		fields: {
		    subject: 'QC Msg',
		    handler_path: 'plugins.quickcapture'
		}
	    };
	    expect(format_subjectFilter(qcNode)).toEqual('QC Msg');
	});

	it('formats a DFRD node', function() {
	    var dfrdNode, subject;
	    dfrdNode = {
		fields: {
		    subject: 'DFRD Node',
		    handler_path: 'plugins.deferred',
		    source_node: 1,
		    node_slug: 'dfrd-node',
		}
	    };
	    expect(format_subjectFilter(dfrdNode).toString())
		.toEqual('<a href="/gtd/project/#1-dfrd-node">DFRD Node</a>');
	});

	it('formats a generic message', function() {
	    var msg;
	    msg = {
		pk: 1,
		fields: {
		    subject: 'hello, world',
		}
	    };
	    expect(format_subjectFilter(msg))
		.toEqual('<a href="/wolfmail/inbox/1/">hello, world</a>');
	});
    });

    describe('the "format_date" filter', function() {
	var format_dateFilter;
	beforeEach(module('owFilters'));
	beforeEach( inject(function(_format_dateFilter_) {
	    format_dateFilter = _format_dateFilter_;
	}));

	it('returns a formatted date string', function() {
	    var date_string, date;
	    date_string = '2014-02-08';
	    date = new Date(date_string);
	    expect(format_dateFilter(date_string)).toEqual(date.toDateString());
	});
    });

    describe('the "parent_label" filter', function() {
	var parent_labelFilter;
	beforeEach(module('owFilters'));
	beforeEach(inject(function(_parent_labelFilter_) {
	    parent_labelFilter = _parent_labelFilter_;
	}));

	it('returns a root-level heading\'s title', function() {
	    var rootNode = {
		title: 'Shiny',
		level: 0,
	    };
	    expect(parent_labelFilter(rootNode)).toEqual(rootNode.title);
	});

	it('indents a level-1 heading', function() {
	    var lvlOneNode = {
		title: 'Steamboat springs',
		level: 1
	    };
	    expect(parent_labelFilter(lvlOneNode))
		.toEqual('--- ' + lvlOneNode.title);
	});

	it('indents a level-2 heading twice', function() {
	    var lvlTwoNode = {
		title: 'margins of steel',
		level: 2,
	    };
	    expect(parent_labelFilter(lvlTwoNode))
		.toEqual('------ ' + lvlTwoNode.title);
	});
    });

}); // End of wolfmail-filters.js tests

describe('directives in wolfmail-directives.js', function() {

}); // End of wolfmail-directives.js tests

describe('services in wolfmail-services.js', function() {

}); // End of wolfmail-services.js test
