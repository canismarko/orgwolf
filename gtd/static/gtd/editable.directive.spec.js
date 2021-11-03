"use strict";

import "angular";
import "angular-mocks";


describe('the owEditable directive', function() {
    var fullNode, $templateCache, $compile, $rootScope, $httpBackend, dummyStates, element, parentHeading;
    beforeEach(angular.mock.module('orgwolf'));
    beforeEach(inject(function($injector) {
	$compile = $injector.get('$compile');
	$rootScope = $injector.get('$rootScope');
	$templateCache = $injector.get('$templateCache');
	// Mock global data (scopes, todo-states, etc)
	parentHeading = {
	    id: 1,
	    title: 'Root-level node 1',
	    focus_areas: [1, 2],
	    priority: 'A',
	};
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
	$httpBackend = $injector.get('$httpBackend');
	$httpBackend.whenGET('/gtd/todostates').respond(201, dummyStates);
	$httpBackend.whenGET('/gtd/focusareas?is_visible=true').respond(200, [
	    {id: 1, display: 'Work'},
	    {id: 2, display: 'Home'}
	]);
	$httpBackend.whenGET('/gtd/nodes/1')
	    .respond(200, parentHeading);
	$httpBackend.whenGET("/gtd/weeklyreviews/activereview/")
	    .respond(204);
	$httpBackend.whenGET('/static/project-outline.html')
	    .respond(200, '');
    }));
    beforeEach(function() {
	// Mock the templateUrl lookup
	$templateCache.put('/static/editable.html',
			   '<div class="editable"></div>');
    });
    afterEach(function() {
	$httpBackend.verifyNoOutstandingExpectation();
	// $httpBackend.verifyNoOutstandingRequest();
    });
    describe('when a new node is being created ([ow-parent])', function() {
	var parentScope, parentFocusAreas;
	beforeEach(function() {
	    element = $compile(
		'<div ow-editable ow-parent="heading"></div>'
	    )($rootScope);
	    $rootScope.heading = parentHeading;
	});
	it("inherits parent's fields if creating a new node (priority and focus areas)", function() {
	    $rootScope.$digest();
	    $httpBackend.flush();
	    expect(element.isolateScope().fields.focus_areas).toEqual(parentHeading.focus_areas);
	});
    });

    describe('when a new root-level node is being created (no attrs)', function() {
	beforeEach(function() {
	    element = $compile('<div ow-editable></div>')($rootScope);
	});
	it('creates a new root-level node', function() {
	    // Simulate the $scope that is return from get_parent() for a top-level node
	    $rootScope.$digest();
	    expect(element.isolateScope().fields.focus_areas).toEqual([]);
	});

	it('adds the ow-editable class (for animations)', function() {
	    $rootScope.$digest();
	    expect(element[0]).toHaveClass('ow-editable');
	});
    });
});
