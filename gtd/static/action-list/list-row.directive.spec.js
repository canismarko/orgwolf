"use strict";

import "angular";
import "angular-mocks";

describe('the owListRow directive', function() {
    var $rootScope, $templateCache, $compile, element, dummyStates, $httpBackend;
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
    beforeEach(angular.mock.module("orgwolf.actionList"));
    beforeEach(inject(function($injector) {
	$httpBackend = $injector.get('$httpBackend');
	$compile = $injector.get('$compile');
	$rootScope = $injector.get('$rootScope');
	$templateCache = $injector.get('$templateCache');
    }));
    beforeEach(function() {
	$rootScope.heading = {
	    id: 1,
	    lft: 1,
	    rght: 2,
	    tag_string: ''
	}
	$templateCache.put('/static/actions-list-row.html',
	    		   '<div></div>');
	$templateCache.put('/static/project-outline.html', '');
	$httpBackend.whenGET('/gtd/todostates').respond(201, dummyStates);
	// Prepare the DOM element
	element = $compile(
	    '<div ow-list-row ow-heading="heading" ow-date="Due today"></div>'
	)($rootScope);;
    });

    it('sets isEditable when edit() is called', function() {
	var scope;
	$rootScope.$digest();
	scope = element.isolateScope();
	scope.edit();
	expect(scope.isEditable).toBeTruthy();
    });

    it('catches the finishEdit signal', function() {
	var parentScope, childScope;
	$rootScope.$digest();
	parentScope = element.isolateScope();
	parentScope.edit();
	expect(parentScope.isEditable).toBeTruthy();
	childScope = parentScope.$new();
	childScope.$emit('finishEdit');
	expect(parentScope.isEditable).toBeFalsy();
    });

    it('responds when a node has just been closed', function() {
	var parentScope, childScope;
	$rootScope.$digest();
	parentScope = element.isolateScope();
	childScope = parentScope.$new();
	childScope.$emit('finishEdit', {}, true);
	expect(parentScope.completed).toBeTruthy();
	childScope.$emit('finishEdit', {}, false);
	expect(parentScope.completed).toBeFalsy();
    });
});
