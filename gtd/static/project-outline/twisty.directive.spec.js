"use strict";

import "angular";
import "angular-mocks";

describe('the owTwisty directive', function() {
    var $rootScope, $httpBackend, $compile, $templateCache, element;
    beforeEach(angular.mock.module("orgwolf.projectOutline"));
    beforeEach(inject(function($injector) {
	$compile = $injector.get('$compile');
	$rootScope = $injector.get('$rootScope');
	$httpBackend = $injector.get('$httpBackend');
	$templateCache = $injector.get('$templateCache');
    }));
    beforeEach(function() {
	$rootScope.heading = {
	    id: 1,
	    lft: 1,
	    rght: 2,
	    tree_id: 1,
	    tag_string: ''
	}
	$templateCache.put('/static/outline-twisty.html',
			   '<div class="ow-hoverable"></div>');
	$templateCache.put('/static/project-outline.html', '');
	$httpBackend.whenGET("/gtd/weeklyreviews?finalized=null&is_active=true")
	    .respond([]);
	$httpBackend.whenGET("/gtd/weeklyreviews/openreview/")
	    .respond([], 404);	
	// Prepare the DOM element
	element = $compile(
	    '<div ow-twisty ow-heading="heading" ng-click="toggleHeading($event)"></div>'
	)($rootScope);;
    });
    it('processes the tag_string', function() {
	var tags = ['home', 'work'];
	$rootScope.heading.tag_string = ':home:work:';
	$rootScope.$digest();
	expect(element.isolateScope().tags).toEqual(tags);
    });
    it('gets children when opened', function() {
	var children = [
	    {id: 2},
	    {id: 3},
	];
	$httpBackend.expect('GET', '/gtd/nodes?field_group=outline&parent_id=1')
	    .respond(200, children);
	$rootScope.$digest();
	element.isolateScope().toggleHeading({target: element});
	$rootScope.$digest();
	$httpBackend.flush();
	expect(JSON.stringify(element.isolateScope().children))
	    .toEqual(JSON.stringify(children));
	expect(element.isolateScope().loadedChildren).toBe(true);
    });
    it('gets children when created if not root level', function() {
	// Prepare the DOM element
	var $scope = $rootScope.$new();
	$scope.heading = {
	    id: 2,
	    lft: 2,
	    rght: 5,
	    tree_id: 1,
	    level: 1,
	    tag_string: ''
	};
	$httpBackend.expectGET(
	    '/gtd/nodes?field_group=outline&parent_id=2'
	).respond(200, []);
	element = $compile(
	    '<div ow-twisty ow-heading="heading" ng-click="toggleHeading($event)"></div>'
	)($scope);
	$rootScope.$digest();
	$httpBackend.flush();
	var scope = element.isolateScope();
	expect(typeof scope.getChildren).toEqual('function');
    });
    it('responds to the open-descendants signal', function() {
	$httpBackend.expectGET('/gtd/nodes?field_group=outline&parent_id=1').respond(200, []);
	$rootScope.$digest();
	var $scope = element.isolateScope();
	expect($scope.state).toBe(0);
	$rootScope.$broadcast('open-descendants');
	expect($scope.state).toBe(1);
    });
    it('cycles through all states when toggled', function() {
	$httpBackend.expectGET('/gtd/nodes?field_group=outline&parent_id=1').respond(200, []);
	$rootScope.heading.rght = 4;
	$rootScope.$digest();
	var scope = element.isolateScope();
	expect(scope.state).toEqual(0);
	scope.toggleHeading({target: element});
	$httpBackend.flush();
	expect(scope.state).toEqual(1);
	expect(element[0]).toHaveClass('gtd-outline__node--state-1');
	scope.toggleHeading({target: element});
	expect(element[0]).toHaveClass('gtd-outline__node--state-2');
	expect(element[0]).not.toHaveClass('gtd-outline__node--state-1');
	expect(scope.state).toEqual(2);
	scope.toggleHeading({target: element});
	expect(scope.state).toEqual(0);
    });
    it('skips state 2 if heading is a leaf node', function() {
	$httpBackend.expectGET('/gtd/nodes?field_group=outline&parent_id=1').respond(200, []);
	$rootScope.$digest();
	var scope = element.isolateScope();
	expect(scope.state).toEqual(0);
	scope.toggleHeading({target: element});
	$httpBackend.flush();
	expect(scope.state).toEqual(2);
	scope.toggleHeading({target: element});
	expect(scope.state).toEqual(0);
    });
    it('broadcasts open-descendants on state 2', function() {
	$httpBackend.expectGET('/gtd/nodes?field_group=outline&parent_id=1').respond(200, []);
	$rootScope.$digest();
	var scope = element.isolateScope();
	var childScope = scope.$new();
	var signalCaught = false;
	childScope.$on('open-descendants', function() {
	    signalCaught = true;
	});
	expect(scope.state).toEqual(0);
	scope.toggleHeading({target: element});
	$httpBackend.flush();
	scope.toggleHeading({target: element});
	expect(signalCaught).toBe(true);
    });
    it('allows the state to be toggled directly', function() {
	$httpBackend.expectGET('/gtd/nodes?field_group=outline&parent_id=1').respond(200, []);
	$rootScope.$digest();
	var scope = element.isolateScope();
	expect(scope.state).toEqual(0);
	scope.toggleHeading(1);
	$httpBackend.flush();
	expect(scope.state).toEqual(1);
	scope.toggleHeading(5);
	expect(scope.state).toEqual(2);
    });
});
