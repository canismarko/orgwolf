import * as angular from "angular";
import "angular-mocks";

describe('the reviewPriority filter', function() {
    let priorityFilter, weeklyReview, testNodes;
    testNodes = [
	{
	    id: 1,
	},
	{
	    id: 2,
	},
    ];
    beforeEach(angular.mock.module('orgwolf.actionList'));
    beforeEach(inject(function($injector) {
	priorityFilter = $injector.get('actionScoreFilter');
	weeklyReview = $injector.get('WeeklyReview');
    }));
    beforeEach(function() {
	weeklyReview.obj = {
	    "primary_tasks": [1],
	};
    });
    it("filters actions for a given priority", function() {
	let results;
	results = priorityFilter(testNodes, weeklyReview, "primary");
	expect(results.length).toEqual(1);
	expect(results[0].id).toEqual(1);
    });
    it("filters actions that are not part of the weekly review");
});
