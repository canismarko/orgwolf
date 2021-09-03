"use strict";

import "angular";
import "angular-mocks";


describe('the sortActions filter', function() {
    var listFilter, activeState, $httpBackend, $rootScope, $scope, locations;
    beforeEach(angular.mock.module('orgwolf.actionList'));
    beforeEach(inject(function($injector) {
	listFilter = $injector.get('sortActionsFilter');
	activeState = $injector.get('activeState');
	locations = $injector.get('locations');
	$rootScope = $injector.get('$rootScope');
	$scope = $rootScope.$new();
	$httpBackend = $injector.get('$httpBackend');
	$httpBackend.whenGET('/gtd/locations').respond(200, [
	    {id: 1,
	     tag_string: 'home'},
	    {id: 2,
	     tag_string: 'work'},
	]);
	$httpBackend.whenGET(/\/static\/project-outline.html/)
	    .respond(200, '');
	$httpBackend.flush();
    }));
    afterEach(function() {
	$httpBackend.verifyNoOutstandingExpectation();
    });
    it('puts nodes with an upcoming deadline at the top', function() {
	var d = new Date();
	// Set new future date within seven days
	// (slicing ensures leading zeroes)
	d.setDate(d.getDate() + 5);
	var futrYear = d.getFullYear();
	var futrMonth = ("0" + (d.getMonth() + 1)).slice (-2);
	var futrDay = ("0" + d.getDate()).slice(-2);
	var future_str = futrYear + '-' + futrMonth + '-' + futrDay;
	var unsorted_data = [{'deadline_date': null},
			     {'deadline_date': future_str}];
	var sorted_data = [{'deadline_date': future_str},
			   {'deadline_date': null}];
	expect(listFilter(unsorted_data)).toEqual(sorted_data);
    });
    it('puts nodes with higher priority at the top', function() {
	var unsorted_data = [{'priority': 'C'},
			     {'priority': 'B'},
			     {'priority': 'A'}];
	var sorted_data = [{'priority': 'A'},
			   {'priority': 'B'},
			   {'priority': 'C'}];
	expect(listFilter(unsorted_data)).toEqual(sorted_data);
    });
    it('puts location-specific tasks at the top', function() {
	var unsortedList, sortedList, homeHeading, otherHeading;
	activeState.context = {'locations_available': [1, 2]};
	homeHeading = {'tag_string': ':home:'};
	otherHeading = {'tag_string': ''};
	unsortedList = [otherHeading, homeHeading];
	sortedList = [homeHeading, otherHeading];
	expect(listFilter(unsortedList)).toEqual(sortedList);
    })
});
