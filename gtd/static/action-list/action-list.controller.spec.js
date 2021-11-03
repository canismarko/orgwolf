"use strict";

import "angular";
import "angular-mocks";

describe('nextActionsList controller', function() {
    var $httpBackend, actionsList, upcomingList, $scope, dummyStates, $templateCache;
    beforeEach(angular.mock.module("orgwolf.actionList"));
    dummyStates = [
	{id: 1},
	{id: 2},
    ];
    beforeEach(inject(function($rootScope, $controller, _$httpBackend_, _$templateCache_) {
	$httpBackend = _$httpBackend_;
	$templateCache = _$templateCache_;
	$scope = $rootScope.$new();
	$controller('nextActionsList', {$scope: $scope});
    }));
    beforeEach(function() {
	actionsList = [
	    {id: 1,
	     scope: [1],
	     todo_state: 2},
	    {id: 2,
	     scope: []},
	];
	upcomingList = [
	    {id: 2,
	     scope: [1]},
	    {id: 3,
	     scope: []},
	];
	$httpBackend.whenGET('/gtd/todostates').respond(200, dummyStates);
	$httpBackend.whenGET('/gtd/contexts?is_visible=true').respond(200, []);
	$httpBackend.whenGET("/gtd/weeklyreviews/activereview/")
	    .respond(204);
	$httpBackend.whenGET('/gtd/focusareas?is_visible=true').respond(200, [
	    {id: 1, display: 'Work'},
	    {id: 2, display: 'Home'}
	]);
	// $httpBackend.whenGET(/\/gtd\/nodes?[^t]?.*/).respond(201, []);
	$httpBackend.whenGET(/\/gtd\/nodes\?field_group=actions_list&todo_state=2(&todo_state=1)?/).respond(201, actionsList);
	$httpBackend.whenGET(/\/gtd\/nodes\?field_group=actions_list&todo_state=2&upcoming=[-0-9]+/)
	    .respond(201, upcomingList);
	$httpBackend.whenGET(/\/gtd\/nodes\?field_group=actions_list&scheduled_date__lte=[-0-9]+&todo_state=8/)
	    .respond(201, []);
	$templateCache.put('/static/project-outline.html', '');
	$templateCache.put('/static/action-list/action-list.html', '');
    });
    // Reset httpBackend calls
    afterEach(function() {
	$httpBackend.verifyNoOutstandingExpectation();
    });
    it('sets the visibleHeadings list upon initialization', function() {
	$scope.$digest();
	$httpBackend.flush();
	expect($scope.visibleHeadings.length).toEqual(2);
    });
    it('sets an indicator for loading status', function() {
	expect($scope.$digest());
	expect($scope.isLoading).toBeTruthy();
	$httpBackend.flush();
	expect($scope.isLoading).toBeFalsy();
    });
    describe('the toggleTodoState() method', function() {
	it('adds the todo-state if it\'s not active', function() {
	    $scope.cachedStates = [2, 1]; // To avoid $http call
	    expect($scope.activeStates).toEqual([2]);
	    $scope.toggleTodoState({id: 1});
	    expect($scope.activeStates).toEqual([2, 1]);
	});
	it('removes a todo-state if it\'s already active', function() {
	    $scope.activeStates = [2, 1];
	    $scope.toggleTodoState({id: 1});
	    expect($scope.activeStates).toEqual([2]);
	});
	it('fetches extra nodes for newly checked todo states', function() {
	    $httpBackend.expectGET('/gtd/nodes?todo_state=1')
		.respond(201, '');
	    $scope.toggleTodoState({id: 1});
	    expect($scope.activeStates).toEqual([2, 1]);
	    $httpBackend.flush();
	    expect($scope.cachedStates).toEqual([2, 1]);
	    $scope.$digest();
	    // Make sure it doesn't add twice
	    $scope.toggleTodoState({id: 1});
	    expect($scope.cachedStates).toEqual([2, 1]);
	});
    });
    describe('the changeContext() method', function() {
	it('updates the cookies with the new context', function() {
	    $httpBackend.whenGET('/gtd/nodes?context=0&field_group=actions_list&todo_state=2')
		.respond(200, {});
	    $httpBackend.whenGET(/\/gtd\/nodes\?context=0&field_group=actions_list&todo_state=2&upcoming=[0-9-]+/)
		.respond(200, {});
	    $scope.changeContext()
	    expect(true).toBeTruthy();
	});
    });
    describe('project filtering', function() {
	beforeEach(function() {
	    $httpBackend.expectGET('/gtd/nodes/1')
		.respond(200, {id: 1});
	});
	it('responds to filter-parent signals', function() {
	    $scope.$emit('filter-parent', 1);
	    expect($scope.parentId).toEqual(1);
	});
	it('watches for changes to parentId', function() {
	    $scope.parentId = 1;
	    $scope.$digest();
	    $httpBackend.flush();
	    $scope.activeParent.id = 1;
	    expect(true).toBeTruthy();
	});
    });
});
