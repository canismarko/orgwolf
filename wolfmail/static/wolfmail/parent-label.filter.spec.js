"use strict";

import "angular";
import "angular-mocks";

describe('the "parent_label" filter', function() {
    var parent_labelFilter;
    beforeEach(angular.mock.module('orgwolf.wolfmail'));
    beforeEach(inject(function(_parent_labelFilter_) {
	parent_labelFilter = _parent_labelFilter_;
    }));

    it('returns a root-level heading\'s title', function() {
	var rootNode = {
	    title: 'Shiny',
	    level: 0,
	};
	expect(parent_labelFilter(rootNode)).toEqual(rootNode.title);
    });

    it('indents a level-1 heading', function() {
	var lvlOneNode = {
	    title: 'Steamboat springs',
	    level: 1
	};
	expect(parent_labelFilter(lvlOneNode))
	    .toEqual('--- ' + lvlOneNode.title);
    });

    it('indents a level-2 heading twice', function() {
	var lvlTwoNode = {
	    title: 'margins of steel',
	    level: 2,
	};
	expect(parent_labelFilter(lvlTwoNode))
	    .toEqual('------ ' + lvlTwoNode.title);
    });
});
