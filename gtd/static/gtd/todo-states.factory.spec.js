"use strict";

import "angular";
import "angular-mocks";

describe('the TodoStates service', function() {
    var todoStates, $httpBackend, mockedStates, $templateCache;
    beforeEach(angular.mock.module("orgwolf.gtd"));
    beforeEach(inject(function($injector) {
	mockedStates = [
	    {id: 1},
	    {id: 2},
	];
	todoStates = $injector.get('todoStates');
	$httpBackend = $injector.get('$httpBackend');
	$httpBackend.whenGET('/gtd/todostates').respond(201, mockedStates);
	$templateCache = $injector.get("$templateCache");
	$templateCache.put('/static/project-outline.html', '');
    }));
    it('sets the getState() method', function() {
	$httpBackend.flush();
	expect(todoStates.getState(1).id).toEqual(1);
    });
});
