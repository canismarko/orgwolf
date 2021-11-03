import * as angular from "angular";
import "angular-mocks";


class MockWeeklyReview {
    primary_tasks = [
	{
	    id: 1,
	    tree_id: 4,
	    lft: 1,
	    rght: 8,
	    root_id: 1,
	}
    ];
    secondary_tasks = [];
    tertiary_tasks = [];
    
}


describe('the priority filter', function() {
    let priorityFilter, weeklyReview, parentNode, childNode, otherNode;
    parentNode = {
	id: 1,
	tree_id: 4,
	lft: 1,
	rght: 8,
	root_id: 1,
    }
    childNode = {
	id: 2,
	tree_id: 4,
	lft: 2,
	rght: 5,
	root_id: 1,
    };
    otherNode = {
	id: 3,
	tree_id: 1,
	lft: 1,
	rght: 2,
	root_id: 3,
    };
    beforeEach(angular.mock.module('orgwolf.gtd'));
    beforeEach(angular.mock.module('orgwolf.weeklyReview'));
    beforeEach(inject(function($injector) {
	priorityFilter = $injector.get('priorityFilter');
	weeklyReview = new MockWeeklyReview();
    }));
    beforeEach(function() {
	weeklyReview.obj = {
	    "primary_tasks": [1],
	};
    });
    it("gives priority to the node specifically in the list", function() {
	let result;
	result = priorityFilter(parentNode, weeklyReview);
	expect(result).toEqual("A");
    });
    it("gives priority to the child nodes of one in the list", function() {
	let result;
	result = priorityFilter(childNode, weeklyReview);
	expect(result).toEqual("A");
    });
    it("filters actions that are not part of the weekly review", function() {
	let result;
	result = priorityFilter(otherNode, weeklyReview);
	expect(result).toEqual(null);
    });
    it("ignores priority if weekly review is expired", function() {
	weeklyReview.isExpired = true;
	let result;
	result = priorityFilter(parentNode, weeklyReview);
	expect(result).toEqual(null);
    });
});
