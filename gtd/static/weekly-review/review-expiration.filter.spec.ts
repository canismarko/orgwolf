"use strict";

import * as angular from "angular";
import "angular-mocks";

describe('the "reviewExpiration" filter', function() {
    let $filter, reviewExpiration;
    beforeEach(angular.mock.module('orgwolf.weeklyReview'));
    beforeEach(inject(function($injector) {
	$filter = $injector.get("$filter");
	reviewExpiration = $filter("reviewExpiration");
    }));
    it('parses dates into strings', function() {
	let today: Date, expiration: Date, result: String;
	today = new Date('2021-10-21T21:46:05Z');
	expiration = new Date('2021-10-23T21:46:05Z');
	result = reviewExpiration(expiration, today);
	// Check that the date is present
	expect(result).toContain("Sat ");
	// Check that the number of days is included
	expect(result).toContain("(in 2 days)");
	// Check deadlines in the past
	result = reviewExpiration(today, expiration);
	expect(result).toContain("(2 days ago)");
    });
    it('handles null and undefined', function() {
	let result: String;
	result = reviewExpiration(null);
	expect(result).toEqual("never");
	result = reviewExpiration(undefined);
	expect(result).toEqual("never");
    });
});
