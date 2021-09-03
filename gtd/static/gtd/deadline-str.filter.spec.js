"use strict";

import "angular";
import "angular-mocks";

describe('the "deadline_str" filter', function() {
    var deadline_strFilter, today, heading, due_date;
    beforeEach(angular.mock.module('orgwolf.gtd'))
    beforeEach(inject(function(_deadline_strFilter_) {
	deadline_strFilter = _deadline_strFilter_;
	today = new Date(2014, 2, 21, 18, 1, 1);
	due_date = new Date(2014, 2, 21, 18, 1, 1);
    }));
    it('returns "" for a heading without a due date', function() {
	heading = {deadline_date: null};
	expect(deadline_strFilter(heading.deadline_date)).toEqual('');
    });
    it('describes a heading due in the future', function() {
	due_date.setDate(due_date.getDate() + 2);
	due_date = due_date.toISOString().slice(0, 10);
	heading = {deadline_date: due_date};
	expect(deadline_strFilter(heading.deadline_date, today))
	    .toEqual('Due in 2 days');
    });
    it('describes a heading due in the past', function() {
	due_date.setDate(due_date.getDate() - 2);
	due_date = due_date.toISOString().slice(0, 10);
	heading = {deadline_date: due_date};
	expect(deadline_strFilter(heading.deadline_date, today))
	    .toEqual('Due 2 days ago');
    });
    it('identifies a heading due today', function() {
	due_date = today.toISOString().slice(0, 10);
	heading = {deadline_date: due_date};
	expect(deadline_strFilter(heading.deadline_date, today)).toEqual('Due today');
    });
    it('identifies a heading due tomorrow', function() {
	due_date.setDate(due_date.getDate() + 1);
	due_date = due_date.toISOString().slice(0, 10);
	heading = {deadline_date: due_date};
	expect(deadline_strFilter(heading.deadline_date, today)).toEqual('Due tomorrow');
    });
    it('identifies a heading due yesterday', function() {
	due_date.setDate(due_date.getDate() - 1);
	due_date = due_date.toISOString().slice(0, 10);
	heading = {deadline_date: due_date};
	expect(deadline_strFilter(heading.deadline_date, today)).toEqual('Due yesterday');
    });
});
