"use strict";

import "angular";
import "angular-mocks";

describe('the *owMessageRow* directive', function() {
    var $compile, $rootScope, $scope, $httpBackend, element, $templateCache;
    beforeEach(angular.mock.module("orgwolf.wolfmail"));
    beforeEach(inject(function($injector) {
	$compile = $injector.get('$compile');
	$rootScope = $injector.get('$rootScope');
	$httpBackend = $injector.get('$httpBackend');
	$templateCache = $injector.get('$templateCache');
    }));
    beforeEach(function() {
	$templateCache.put('/static/project-outline.html', '');
	$rootScope.message = {id: 1};
	element = $compile('<div ow-message-row></div>')($rootScope);
    });
    afterEach(function() {
	$httpBackend.verifyNoOutstandingExpectation();
    });
    it('responds to the "heading-created" signal', function() {
	$scope = element.scope();
	expect($scope.headings.length).toEqual(0);
	$scope.$broadcast('heading-created', {id: 1}, {id: 27});
	expect($scope.headings.length).toEqual(1);
    });
    it('checks id for "heading-created" signal', function() {
	$scope = element.scope();
	$scope.$broadcast('heading-created', {id: 2}, {id: 27});
	expect($scope.headings.length).toEqual(0);
    });
});
