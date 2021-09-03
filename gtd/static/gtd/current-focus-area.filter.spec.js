"use strict";

import "angular";
import "angular-mocks";

describe('the currentFocusArea filter', function() {
    var dummyHeadings, focusAreaFilter;
    beforeEach(angular.mock.module('orgwolf.gtd'))
    beforeEach(inject(function(_currentFocusAreaFilter_) {
	focusAreaFilter = _currentFocusAreaFilter_;
	dummyHeadings = [
	    {id: 1,
	     focus_areas: [1, 2]},
	    {id: 2,
	     focus_areas: [1]},
	    {id: 3,
	     focus_areas: []},
	    {id: 4,
	     focus_areas: [6]}
	];
    }));

    it('filters headings based on active focus area', function() {
	var filteredList = focusAreaFilter(dummyHeadings, {id: 2});
	expect(filteredList.length).toBe(1);
	expect(JSON.stringify(filteredList[0]))
	    .toEqual(JSON.stringify( dummyHeadings[0] ));
    });

    it('allows all headings if no active focus area', function() {
	var filteredList = focusAreaFilter(dummyHeadings, {id: 0});
	expect(filteredList).toEqual(dummyHeadings);
    });

    it('identifies nodes with no focus area', function() {
	var headings = [{id: 1, focus_areas: []},
			{id: 2, focus_areas: [1]}];
	var filteredList = focusAreaFilter(headings, {id: -1});
	expect(filteredList.length).toEqual(1);
	expect(filteredList[0].id).toEqual(1);
    });
});
