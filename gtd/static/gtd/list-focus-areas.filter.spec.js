"use strict";

import "angular";
import "angular-mocks";

describe('the listFocusAreas filter', function() {
    var listFocusAreasFilter, $httpBackend;
    beforeEach(angular.mock.module('orgwolf.gtd'))
    beforeEach(inject(function($injector) {
	listFocusAreasFilter = $injector.get('listFocusAreasFilter');
	$httpBackend = $injector.get('$httpBackend');
	$httpBackend.whenGET('/gtd/focusareas?is_visible=true')
	    .respond(200, [
		{id: 1,
		 display: 'Work'},
		{id: 2,
		 display: 'Home'},
		{id: 3,
		 display: 'Health'},
	    ]);
	$httpBackend.whenGET(/\/static\/project-outline.html/)
	    .respond(200, '');
	$httpBackend.flush();
    }));
    it('processes a heading with one focus area', function() {
	var heading = {focus_areas: [1]};
	expect(listFocusAreasFilter(heading)).toEqual('Work');
    });
    it('processes a heading with two focus areas', function() {
	var heading = {focus_areas: [1, 2]};
	expect(listFocusAreasFilter(heading)).toEqual('Work and Home');
    });
    it('processes a heading with three focus areas', function() {
	var heading = {focus_areas: [1, 2, 3]};
	expect(listFocusAreasFilter(heading))
	    .toEqual('Work, Home and Health');
    });
});
