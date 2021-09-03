"use strict";

import "angular";
import "angular-mocks";

describe('the "format_date" filter', function() {
    var format_dateFilter;
    beforeEach(angular.mock.module('orgwolf.wolfmail'));
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
