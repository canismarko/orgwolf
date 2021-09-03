"use strict";

import "angular";
import "angular-mocks";

describe('calendar controller', function() {
    var $scope, $httpBackend, $templateCache;
    beforeEach(angular.mock.module("orgwolf.gtd"));
    beforeEach(inject(function($rootScope, $controller, _$httpBackend_, _$templateCache_) {
	$scope = $rootScope.$new();
	$controller('calendar', {$scope: $scope});
	$httpBackend = _$httpBackend_;
	$httpBackend.whenGET('/gtd/contexts').respond(200);
	$httpBackend.whenGET('/gtd/focusareas?is_visible=true').respond(200, [
	    {id: 1, display: 'Work'},
	    {id: 2, display: 'Home'}
	]);
	$httpBackend.whenGET('/gtd/nodes?archived=false&field_group=calendar&todo_state__abbreviation=HARD')
	    .respond(200);
	$httpBackend.whenGET('/gtd/nodes?archived=false&field_group=calendar&todo_state__abbreviation=DFRD')
	    .respond(200);
	$httpBackend.whenGET('/gtd/nodes?archived=false&deadline_date__gt=1970-01-01&field_group=calendar_deadlines')
	    .respond(200);
	$templateCache = _$templateCache_;
    }));
    beforeEach(function() {
	$scope.owCalendar = {fullCalendar: function() {}};
	$scope.activeCalendars = [1];
	$templateCache.put('/static/project-outline.html', '');
    });
    afterEach(function() {
	$httpBackend.verifyNoOutstandingExpectation();
    });
    it('creates the allCalendars list', function() {
	expect($scope.allCalendars.length).toBe(3);
    });
    it('toggles a currently active calendar', function() {
	$scope.toggleCalendar($scope.allCalendars[0]);
	expect($scope.activeCalendars.length).toEqual(0);
    });
    it('toggles a currently inactive calendar', function() {
	$scope.toggleCalendar($scope.allCalendars[1]);
	expect($scope.activeCalendars.length).toEqual(2);
    });
    it('reschedules a day-specific node', function() {
	var newDate = new Date('2014-06-16T12:00:00.000Z');
	$httpBackend.expectPUT('/gtd/nodes/1',
			       '{"id":1,"scheduled_date":"2014-6-16"}')
	    .respond(200, {});
	$scope.moveEvent({id: 1,
			  start: newDate,
			  allDay: true,
			 });
	expect(true).toBeTruthy();
    });
    it('reschedules a time-specific node', function() {
	var newDate, expectedDate, expectedTime, expectedString;
	newDate = new Date("2014-06-17T03:17:05.746Z");
	expectedDate = '' + newDate.getFullYear() + '-' +
	    (newDate.getMonth() + 1) + '-' + newDate.getDate();
	expectedTime = '' + newDate.getHours() + ':' + newDate.getMinutes();
	expectedString = '{"id":1,"scheduled_date":"' + expectedDate +
	    '","scheduled_time":"' + expectedTime + '"}';
	$httpBackend.expectPUT('/gtd/nodes/1', expectedString)
	    .respond(200, {});
	$scope.moveEvent({id: 1,
			  start: newDate,
			  allDay: false,
			 });
	expect(true).toBeTruthy();
    });
    it('reschedules a deadline node', function() {
	var newDate = new Date("2014-06-16T12:00:00.000Z");
	$httpBackend.expectPUT('/gtd/nodes/1',
			       '{"id":1,"deadline_date":"2014-6-16"}')
	    .respond(200, {});
	$scope.moveEvent({id: 1,
			  start: newDate,
			  allDay: true,
			  field_group: 'calendar_deadlines'});
	expect(true).toBeTruthy();
    });
    it('resizes a scheduled node with date only', function() {
	var newDate = new Date("2014-06-16T12:00:00.000Z");
	$httpBackend.expectPUT('/gtd/nodes/1',
			       '{"id":1,"end_date":"2014-6-16"}')
	    .respond(200, {});
	$scope.resizeEvent({id: 1,
			    end: newDate,
			    allDay: true,
			    field_group: 'calendar'});
	expect(true).toBeTruthy();
    });
    it('resizes a scheduled node with date and time', function() {
	var newDate, expectedDate, expectedTime, expectedString;
	var newDate = new Date("2014-06-16T03:55:59.000Z");
	// Prepare expected request data string
	expectedDate = '' + newDate.getFullYear() + '-' +
	    (newDate.getMonth() + 1) + '-' + newDate.getDate();
	expectedTime = '' + newDate.getHours() + ':' + newDate.getMinutes();
	expectedString = '{"id":1,"end_date":"' + expectedDate +
	    '","end_time":"' + expectedTime + '"}';
	$httpBackend.expectPUT('/gtd/nodes/1', expectedString)
	    .respond(200, {});
	$scope.resizeEvent({id: 1,
			    end: newDate,
			    allDay: false,
			    field_group: 'calendar'});
	expect(true).toBeTruthy();
    });
    it('doesn\'t resize a deadline node', function() {
	// This test is valid since no $httpBackend call is expected
	$scope.resizeEvent({id: 1,
			    end: new Date(),
			    field_group: 'calendar_deadlines'});
	expect(true).toBeTruthy();
    });
});
