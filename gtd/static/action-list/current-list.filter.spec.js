"use strict";

import "angular";
import "angular-mocks";

describe('the "currentList" filter', function() {
    var currentListFilter, headings;
    beforeEach(angular.mock.module('orgwolf.actionList'))
    beforeEach(inject(function(_currentListFilter_) {
	currentListFilter = _currentListFilter_;
	headings = [
	    {id: 1,
	     todo_state: 1,
	     focus_areas: [1]},
	    {id: 2,
	     todo_state: 2,
	     focus_areas: []},
	];
    }));
    it('passes the array back if no parameters given', function() {
	var result = currentListFilter(headings);
	expect(result).toBe(headings);
    });
    it('filters by active todoState', function() {
	var result = currentListFilter(headings, [1]);
	expect(result.length).toEqual(1);
	expect(result[0]).toBe(headings[0]);
    });
    it('filters out headings that are also on the upcoming list', function() {
	var upcomingList = [
	    {id: 2},
	    {id: 3},
	];
	headings[1].deadline_date = '2014-03-08';
	var result = currentListFilter(headings, [1, 2], upcomingList);
	expect(result.length).toEqual(1);
	expect(result[0]).toBe(headings[0]);
    });
    it('filters by activeParent', function() {
	headings = [
	    {id: 1, tree_id: 1, lft: 2, rght: 5},
	    {id: 2, tree_id: 2, lft: 1, rght: 2},
	    {id: 3, tree_id: 1, lft: 6, rght: 7},
	    {id: 4, tree_id: 1, lft: 3, rght: 4},
	];
	var activeParent = headings[0]
	var result = currentListFilter(headings, null, [], activeParent);
	expect(result.length).toEqual(2);
	expect(result[0].id).toEqual(1);
	expect(result[1].id).toEqual(4);
    });
});
