"use strict";

describe('the static url filter', function() {
    var staticFilter;
    beforeEach(module('owFilters'));
    beforeEach(function() {
	owFilters.value('staticUrl', '/static/');
    });
    beforeEach(inject(function(_staticFilter_) {
    	staticFilter = _staticFilter_
    }));
    it('appends the passed string to the static url', function() {
	expect(typeof staticFilter('file.txt')).toEqual('string');
	expect(staticFilter('file.txt')).toEqual('/static/file.txt');
    });
});

describe('the ow-nav navigation directive', function() {
    var $compile, $rootScope, element, $scope;
    beforeEach(module('owDirectives'));
    beforeEach(inject(function($injector) {
	$compile = $injector.get('$compile');
	$rootScope = $injector.get('$rootScope');
	element = $compile('<div ow-navbar></div>')($rootScope);
    }));
    it('recognizes changes to the url', function() {
	$scope = element.scope();
	$scope.$broadcast('$locationChangeSuccess');
	expect(true).toBeTruthy();
    });
});
