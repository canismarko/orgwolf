"use strict";

import "angular";
import "angular-mocks";


describe('the actionScore filter', function() {
    var scoreFilter;
    beforeEach(angular.mock.module('orgwolf.actionList'))
    beforeEach(inject(function($injector) {
	scoreFilter = $injector.get('actionScoreFilter');
    }));
    beforeEach(function() {
	let now = new Date("2021-05-29");
	jasmine.clock().mockDate(now);
    });
    it('adds points for priority score', function() {
	var heading;
	heading = {priority: _ => 'A'};
	expect(scoreFilter(heading)).toEqual(4);
    });
    it('adds points for an upcoming deadline', function() {
	var heading, nextWeek;
	// Deadline is 1 week away
	nextWeek = new Date();
	nextWeek.setDate(nextWeek.getDate() + 6)
	heading = {deadline_date: nextWeek,
		   priority: _ => null};
	expect(scoreFilter(heading)).toBeCloseTo(3/7 + 1, 7);
    });
    it('adds points for a past deadline', function() {
	var heading, yesterday;
	// Deadline has already passed
	yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	heading = {deadline_date: yesterday,
		   priority: _ => null};
	expect(scoreFilter(heading)).toEqual(4);
    });
    it('adds a point if there is an active location', function() {
	var heading;
	heading = {tag_string: ':home:',
		   priority: _ => null},
	expect(scoreFilter(heading)).toEqual(1);
    });
});
