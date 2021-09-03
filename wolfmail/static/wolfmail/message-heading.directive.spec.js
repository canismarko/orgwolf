"use strict";

import "angular";
import "angular-mocks";

describe('owMessageHeading', function() {
    var $compile, $scope, $rootScope, $httpBackend, element, $templateCache;
    beforeEach(angular.mock.module("orgwolf"));
    beforeEach(inject(function($injector) {
	$httpBackend = $injector.get('$httpBackend');
	$compile = $injector.get('$compile');
	$rootScope = $injector.get('$rootScope');
	$templateCache = $injector.get('$templateCache');
    }));
    beforeEach(function() {
	$rootScope.heading = {id: 1};
	element = $compile('<div ow-message-heading></div>')($rootScope);
	$httpBackend.whenGET('/gtd/todostates').respond(200, []);
	$templateCache.put('/static/project-outline.html', '');
    });
    afterEach(function() {
	$httpBackend.verifyNoOutstandingExpectation();
    });
    it('responds to the finishEdit signal', function() {
	$rootScope.$digest();
	$scope = element.scope();
	expect($scope.isEditable).toBe(false);
	$scope.isEditable = true;
	$scope.$emit('finishEdit');
	expect($scope.isEditable).toBe(false);
    });
});
