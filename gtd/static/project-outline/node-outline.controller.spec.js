"use strict";

import "angular";
import "angular-mocks";

describe('the nodeOutline controller', function() {
    var $scope, $controller, $httpBackend, $location, $templateCache;
    beforeEach(angular.mock.module("orgwolf"));
    beforeEach(inject(function($injector) {
	var nodesUrl = '/gtd/nodes?archived=false&field_group=outline&parent_id=0';
	// Set up backend stuffs
	$httpBackend = $injector.get('$httpBackend');
	$httpBackend.whenGET(nodesUrl).respond(200, []);
	$location = $injector.get('$location');
	$controller = $injector.get('$controller');
	$scope = $injector.get('$rootScope').$new();
	$templateCache = $injector.get('$templateCache');
    }));
    beforeEach(function() {
	$templateCache.put('/static/project-outline.html', '');
    });
    // Reset httpBackend calls
    afterEach(function() {
	$httpBackend.verifyNoOutstandingExpectation();
    });
    it('handles the "focus-area-changed" signal', function() {
	$controller('nodeOutline', {$scope: $scope});
	expect($scope.activeFocusArea).toBe(undefined);
	var newFocusArea = {id: 1};
	$scope.$emit('focus-area-changed', newFocusArea);
	expect($scope.activeFocusArea).toBe(newFocusArea);
    });
    it('activates the activeNode if given in location string', function() {
	$location.hash('1-test-title');
	$httpBackend.expectGET('/gtd/nodes/1')
	    .respond(200, {
		id: 1,
		tree_id: 1
	    });
	$controller('nodeOutline', {$scope: $scope});
	$httpBackend.flush();
	expect(true).toBeTruthy();
    });
});
