"use strict";

import "angular";
import "angular-mocks";

describe('the "order" filter', function() {
    var orderFilter;
    beforeEach(angular.mock.module('orgwolf'))
    beforeEach(angular.mock.module('orgwolf.projectOutline'))
    beforeEach(inject(function(_orderFilter_) {
	orderFilter = _orderFilter_;
    }));
    it('sorts by criterion', function() {
	var unsorted_data = [{'key': 'bravo'}, {'key': 'alpha'},
			     {'key': 'delta'}, {'key': 'charlie'}];
	var sorted_data = [{'key': 'alpha'}, {'key': 'bravo'},
			   {'key': 'charlie'}, {'key': 'delta'}];
	expect(orderFilter(unsorted_data, 'key')).toEqual(sorted_data);
    });
    it('puts relatives of activeHeading to the top', function() {
	var unsorted = [{title: 'last', tree_id: 1},
			{title: 'first', tree_id: 2}];
	var sorted = orderFilter(unsorted, 'none', {tree_id: 2});
	expect(sorted[0].title).toEqual('first');
    })
});
