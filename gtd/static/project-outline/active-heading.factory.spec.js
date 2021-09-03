"use strict";

import "angular";
import "angular-mocks";

describe('the activeHeading.activate() method', function() {
    var $httpBackend, activeHeading;
    beforeEach(inject(function($injector) {
	$httpBackend = $injector.get('$httpBackend');
	activeHeading = $injector.get('activeHeading');
    }));
    afterEach(function() {
	$httpBackend.verifyNoOutstandingExpectation();
    });
    it('retrieves the heading from the server', function() {
	activeHeading.activate(1);
	$httpBackend.expectGET('/gtd/nodes/1').respond(200, {
	    id: 1,
	    tree_id: 1,
	});
	$httpBackend.flush();
	expect(activeHeading.id).toEqual(1);
    });
    it("resets the object if an empty string is supplied", function() {
	activeHeading.obj = 'Not reset'; // To test for proper resetting
	activeHeading.activate('');
	expect(activeHeading.obj).toBe(null);
	expect(activeHeading.id).toBe(0);
    });
});
