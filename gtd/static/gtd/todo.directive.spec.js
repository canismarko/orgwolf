"use strict";

import "angular";
import "angular-mocks";

describe('the owTodo directive', function() {
    var $scope, $rootScope, $templateCache, $httpBackend, $compile, element, dummyStates;
    // var $templateCache, $compile, element, $rootScope, $httpBackend;
    beforeEach(angular.mock.module("orgwolf.gtd"));
    beforeEach(inject(function($injector) {
	$compile = $injector.get('$compile');
	$rootScope = $injector.get('$rootScope');
	$httpBackend = $injector.get('$httpBackend');
	$templateCache = $injector.get('$templateCache');
    }));
    beforeEach(function() {
	$rootScope.heading = {
	    todo_state: 1,
	    // $update: function() {},
	};
	$templateCache.put('/static/todo-state-selector.html',
			   '<select ng-model="todoStateId"></div>');
	$templateCache.put('/static/project-outline.html', '');
	// Prepare the DOM element
	element = $compile(
	    '<div ow-todo ow-heading="heading"></div>'
	)($rootScope);
		// Mock global data (scopes, todo-states, etc)
	dummyStates = [
	    {
		id: 1,
		color: {
		    red: 0,
		    green: 0,
		    blue: 0,
		    alpha: 0,
		}
	    },
	    {
		id: 2,
		color: {
		    red: 0,
		    green: 0,
		    blue: 0,
		    alpha: 0,
		}
	    }
	];
	$httpBackend.whenGET('/gtd/todostates').respond(201, dummyStates);
	$httpBackend.flush();
    });

    it('does not call heading.$update during initialization', function() {
	var hitApi = false;
	$rootScope.heading.$update = function() {
	    hitApi = true;
	};
	$rootScope.$digest();
	expect(hitApi).toEqual(false);
    });

    it('updates models when todoStateId changes', function() {
	var scope, expectedState;
	$rootScope.heading.$update = function() {
	    return {
		then: function() {
		    return {
			'catch': function() {}
		    };
		}
	    };
	};
	$rootScope.$digest();
	scope = element.isolateScope();
	scope.todoStateId = 2;
	$rootScope.$digest();
	expectedState = dummyStates.filter(
	    function(o) {return o.id===2;}
	)[0];
	expect(JSON.stringify(scope.todoState))
	    .toEqual(JSON.stringify(expectedState));
	expect(scope.todoStateId).toEqual(2);
	expect($rootScope.heading.todo_state).toEqual(2);
    });

    it('responds to changes in $parent.heading.todo_state', function() {
	$rootScope.heading.$update = function() {
	    return {
		then: function() {
		    return {
			'catch': function() {}
		    };
		}
	    };
	};
	$rootScope.$digest();
	$rootScope.heading.todo_state = 2;
	$rootScope.$digest();
	expect(element.isolateScope().todoStateId).toEqual(2);
    });
});
