"use strict";

import "angular";
import "angular-mocks";


describe('the "todoStateStyle" filter', function() {
    var todoStateStyleFilter;
    beforeEach(angular.mock.module('orgwolf.gtd'))
    beforeEach(inject(function(_todoStateStyleFilter_) {
	todoStateStyleFilter = _todoStateStyleFilter_;
    }));
    it('translates the todo_state\'s color', function() {
	var colorlessState = {
	    color: {
		red: 0,
		green: 0,
		blue: 0,
		alpha: 0
	    }
	};
    	expect(todoStateStyleFilter(colorlessState)).toEqual('color: rgba(0, 0, 0, 0); ');
	var redState = {
	    color: {
		red: 204,
		green: 0,
		blue: 0,
		alpha: 0.5
	    }
	};
    	expect(todoStateStyleFilter(redState)).toEqual('color: rgba(204, 0, 0, 0.5); ');
    });
});
