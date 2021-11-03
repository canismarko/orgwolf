"use strict";

import "angular";
import "angular-mocks";

describe('the Heading service', function() {
    var Heading, heading, $rootScope, $httpBackend, $templateCache;
    beforeEach(angular.mock.module("orgwolf.gtd"));
    beforeEach(inject(function($injector) {
	$httpBackend = $injector.get('$httpBackend');
	$templateCache = $injector.get('$templateCache');
	Heading = $injector.get('Heading');
    }));
    beforeEach(function() {
	$templateCache.put('/static/project-outline.html', '');
	// Create a mocked Heading object
	$httpBackend.whenGET("/gtd/weeklyreviews/activereview/")
	    .respond(204);
	$httpBackend.when('GET', '/gtd/nodes/1')
	    .respond(201, {
		id: 1,
		title: 'test heading 1'
	    });
	heading = Heading.get({id: 1});
	$httpBackend.flush();
    });
    afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
    });

    it('uses the PUT method to update', function() {
	$httpBackend.expect('PUT', '/gtd/nodes/1')
	    .respond(201, {});
	heading.$update();
	$httpBackend.flush();
	expect(true).toBeTruthy();
    });

    it('uses the POST method to update', function() {
	$httpBackend.expect('POST', '/gtd/nodes')
	    .respond(201, {});
	Heading.create({title: 'hello'});
	$httpBackend.flush();
	expect(true).toBeTruthy();
    });
});
