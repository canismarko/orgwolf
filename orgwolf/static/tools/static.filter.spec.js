"use strict";

import "angular";
import "angular-mocks";


describe('the static url filter', function() {
    var staticFilter;
    beforeEach(angular.mock.module('orgwolf.tools'));
    beforeEach(function() {
	angular.module('orgwolf.tools').value('staticUrl', '/static/');
    });
    beforeEach(inject(function(_staticFilter_) {
    	staticFilter = _staticFilter_
    }));
    it('appends the passed string to the static url', function() {
	expect(typeof staticFilter('file.txt')).toEqual('string');
	expect(staticFilter('file.txt')).toEqual('/static/file.txt');
    });
});
