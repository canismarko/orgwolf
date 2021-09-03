"use strict";

import "angular";
import "angular-mocks";

describe('the owFocusAreaTabs directive', function() {
    var $childScope, $templateCache, $compile, element, $rootScope, $httpBackend;
    beforeEach(angular.mock.module("orgwolf.gtd"));
    beforeEach(inject(function($injector) {
	$compile = $injector.get('$compile');
	$rootScope = $injector.get('$rootScope');
	$httpBackend = $injector.get('$httpBackend');
	$templateCache = $injector.get('$templateCache');
    }));
    beforeEach(function() {
	$httpBackend.whenGET('/gtd/focusareas?is_visible=true').respond(200, [
	    {id: 1, display: 'Work'},
	    {id: 2, display: 'Home'}
	]);
	$templateCache.put(
	    '/static/focus-area-tabs.html',
	    '<ul><li id="fa-tab-{{ fa.id }}" ng-repeat="fa in focusAreas"><a href="#">{{ fa.display }}</a></li></ul>'
	);
	$templateCache.put('/static/project-outline.html', '');
	element = $compile(
	    '<div ow-focus-area-tabs></div>'
	)($rootScope);
    });
    it('emits the "change-focus-area" event on changeFocusArea()', function() {
	var emittedStatus, targetFocusArea, emittedFocusArea;
	$rootScope.$digest();
	$childScope = element.isolateScope();
	expect($childScope).toBeDefined();
	targetFocusArea = {id: 1};
	$rootScope.$on('focus-area-changed', function(e, newFocusArea) {
	    emittedStatus = true;
	    emittedFocusArea = newFocusArea;
	});
	$childScope.changeFocusArea(targetFocusArea);
	expect(emittedStatus).toBeTruthy();
	expect(emittedFocusArea).toBe(targetFocusArea);
    });
    it('sets scope.activeFocusArea on changeFocusArea()', function() {
	var newFocusArea;
	newFocusArea = {id: 1};
	$rootScope.$digest();
	$childScope = element.isolateScope();
	$childScope.changeFocusArea(newFocusArea);
	expect($childScope.activeFocusArea).toBe(newFocusArea);
    });
    it('moves the "active" class to a tab on changeFocusArea()', function() {
	var newFocusArea = {id: 1};
	$httpBackend.flush();
	$rootScope.$digest();
	// Set the first focus area
	$childScope = element.isolateScope();
	$childScope.changeFocusArea(newFocusArea);
	expect(element.find('#fa-tab-1 a')[0]).toHaveClass('active');
	expect(element.find('#fa-tab-2 a')[0]).not.toHaveClass('active');
	// Now change the focus area
	newFocusArea = {id: 2};
	$childScope.changeFocusArea(newFocusArea)
	expect(element.find('#fa-tab-2 a')[0]).toHaveClass('active');
	expect(element.find('#fa-tab-1 a')[0]).not.toHaveClass('active');
    });
});
