"use strict";

import "angular-mocks";

describe('Array.order_by method', function() {
    var headings, result;
    beforeEach(angular.mock.module('orgwolf.gtd'));
    beforeEach(function() {
	headings = [
	    {id: 2},
	    {id: 3},
	    {id: 1},
	];
    });
    it('orders an array in ascending order', function() {
	result = headings.order_by('id');
	expect(result[0].id).toBe(1);
    });
    it('orders an array in descending order', function() {
	result = headings.order_by('-id');
	expect(result[0].id).toBe(3);
    });
});
