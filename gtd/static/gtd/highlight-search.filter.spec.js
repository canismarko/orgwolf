"use strict";

import "angular";
import "angular-mocks";

describe('the highlightSearch filter', function() {
    var filter;
    beforeEach(angular.mock.module('orgwolf.gtd'))
    beforeEach(inject(function($injector) {
	filter = $injector.get("highlightSearchFilter");
    }));
    it('wraps a search query in a span element', function() {
	var filteredTitle, expectedText;
	filteredTitle = filter("a very nice day", 'very');
	expect(filteredTitle).toEqual(
	    'a <span class="highlight">very</span> nice day');
    })
});
