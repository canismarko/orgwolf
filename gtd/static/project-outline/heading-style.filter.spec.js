"use strict";

import "angular";
import "angular-mocks";


describe('the "headingStyle" filter', function() {
    var headingStyleFilter;
    beforeEach(angular.mock.module('orgwolf.projectOutline'))
    beforeEach(inject(function(_headingStyleFilter_) {
	headingStyleFilter = _headingStyleFilter_;
    }));
    it('determines heading color based on level', function() {
	var lvlOneHeading = {level: 1};
	var lvlTwoHeading = {level: 2};
	var lvlSixHeading = {level: 6};
	expect(headingStyleFilter(lvlOneHeading)).toEqual('color: rgb(80, 0, 0); ');
	expect(headingStyleFilter(lvlTwoHeading)).toEqual('color: rgb(0, 44, 19); ');
	expect(headingStyleFilter(lvlSixHeading)).toEqual('color: rgb(80, 0, 0); ');
    });
});
