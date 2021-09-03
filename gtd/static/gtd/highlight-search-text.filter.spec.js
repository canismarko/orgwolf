"use strict";

import "angular";
import "angular-mocks";

describe('the highlightSearchText filter', function() {
    var filter;
    beforeEach(angular.mock.module('orgwolf.gtd'))
    beforeEach(inject(function($injector) {
	filter = $injector.get("highlightSearchTextFilter");
    }));
    it('returns an empty string if no match was found', function() {
	var filteredText = filter("a very nice day", 'never');
	expect(filteredText).toEqual('');
    });
    it('returns 40 characters before the first match', function() {
	var filteredText = filter(
	    "it's a wonderful day in the neighbourhood and we can jam",
	    'and');
	expect(filteredText).toEqual(
	    "&hellip;'s a wonderful day in the neighbourhood and we can jam"
	);
    });
    it('truncates long text', function() {
	var dummyText;
	// Repeat this text a few times to get a long string
	dummyText = "Wishes are funny things. Unless you're a ghost. ";
	dummyText += dummyText + dummyText + dummyText;
	dummyText += dummyText + dummyText + dummyText;
	dummyText += dummyText + dummyText + dummyText;
	var filteredText = filter(
	    dummyText,
	    'wishes');
	expect(filteredText.length).toEqual(508);
	expect(filteredText.slice(-8)).toEqual('&hellip;');
    });
    it('appends the number of matches at the end');
});
