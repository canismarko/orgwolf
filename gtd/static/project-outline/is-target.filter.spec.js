"use strict";

import "angular";
import "angular-mocks";


describe('the "is_target" filter', function () {
    var is_targetFilter;
    beforeEach(angular.mock.module('orgwolf.projectOutline'));
    beforeEach(inject(function(_is_targetFilter_) {
    	is_targetFilter = _is_targetFilter_
    }));

    it('identifies active heading', function() {
    	var heading = {pk: 1};
    	var active_heading = {id: 1};
    	expect(is_targetFilter(heading, active_heading)).toEqual('yes');
    });
    it('identifies ancestor heading', function() {
	var heading = {
	    pk: 1,
	    fields: {tree_id: 1, lft: 1, rght: 4},
	};
	var active_heading = {
	    id: 2,
	    tree_id: 1,
	    lft: 2,
	    rght: 3
	};
	expect(is_targetFilter(heading, active_heading)).toEqual('ancestor');
    });
});
