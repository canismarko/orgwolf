"use strict";

import 'angular';
import 'fullcalendar';
import moment from 'moment';
window.moment = moment;

angular.module('orgwolf.gtd')
    .controller('calendar', calendar);


calendar.$inject = ['$scope', 'Heading', '$filter', '$uibModal'];


function calendar($scope, Heading, $filter, $uibModal) {
    /*************************************************
     * Calendar controller
     *
     **************************************************/
    // Uses angular-ui-calendar from https://github.com/angular-ui/ui-calendar
    var date, d, m, y;
    // List of calendars that are actually shown
    $scope.activeCalendars = [];
    date = new Date();
    d = date.getDate();
    m = date.getMonth();
    y = date.getFullYear();
    // Method for adding/removing calendars from the list
    $scope.toggleCalendar = function(cal) {
	var idx;
	idx = $scope.activeCalendars.indexOf(cal.calId);
	if (idx > -1) {
	    // Remove calendar
	    $scope.activeCalendars.splice(idx, 1);
	} else {
	    // Add calendar
	    $scope.activeCalendars.push(cal.calId);
	}
	console.error("Currently broken. Why does $scope.owCalendar not exist?");
	$scope.owCalendar.fullCalendar('render');
    };
    // Retrieves the calendars via the API
    $scope.allCalendars = [];
    $scope.refreshCalendars = function() {
	var hardCalendar, dfrdCalendar, upcomingCalendar;
	// Hard scheduled tasks
	hardCalendar = {
	    calId: 1,
	    order: 10,
	    name: 'Scheduled tasks [HARD]',
	    color: 'rgb(92, 0, 92)',
	    textColor: 'white',
	    field_group: 'calendar',
	    events: Heading.query({field_group: 'calendar',
				   todo_state__abbreviation: 'HARD',
				   archived: false}),
	};
	// Deferred items/messages
	dfrdCalendar = {
	    calId: 2,
	    order: 20,
	    name: 'Reminders [DFRD]',
	    color: 'rgb(230, 138, 0)',
	    textColor: 'white',
	    field_group: 'calendar',
	    events: Heading.query({field_group: 'calendar',
				   todo_state__abbreviation: 'DFRD',
				   archived: false}),
	};
	// Upcoming deadlines
	upcomingCalendar = {
	    calId: 3,
	    order: 30,
	    name: 'Deadlines',
	    color: 'rgb(204, 0, 0)',
	    textColor: 'white',
	    field_group: 'calendar_deadlines',
	    events: Heading.query({field_group: 'calendar_deadlines',
				   deadline_date__gt: '1970-01-01',
				   archived: false}),
	};
	// Reset list of calendars
	$scope.allCalendars.length = 0;
	$scope.allCalendars.push(hardCalendar);
	$scope.allCalendars.push(dfrdCalendar);
	$scope.allCalendars.push(upcomingCalendar);
    };
    $scope.$on('refresh-data', $scope.refreshCalendars);
    $scope.refreshCalendars();
    // Handler for editing an event
    $scope.editEvent = function(obj) {
	var newScope, $off, modal;
	// Prepare and show the modal for editing the event
	newScope = $scope.$new(true);
	newScope.editableEvent = obj;
	modal = $uibModal.open({
	    scope: newScope,
	    templateUrl: 'edit-modal',
	    windowClass: 'calendar-edit'});
	// Listen for a response from the edit dialog
	$off = $scope.$on('finishEdit', function(e, newHeading) {
	    obj.$get();
	    modal.close();
	    $off();
	});
    };
    // Handler for drag & drop rescheduling
    $scope.moveEvent = function(obj, dayDelta, minuteDelta) {
	var newData, timeString, dateString, dateField, timeField;
	// Determine if scheduled or deadline fields will be used
	if (obj.field_group === 'calendar_deadlines') {
	    dateField = 'deadline_date';
	    timeField = 'deadline_time';
	} else {
	    dateField = 'scheduled_date';
	    timeField = 'scheduled_time';
	}
	// Day-specific
	newData = {id: obj.id};
	dateString = obj.start.getFullYear() + '-' + (obj.start.getMonth() + 1) + '-' + obj.start.getDate();
	newData[dateField] = dateString;
	if (!obj.allDay) {
	    // Time-specific
	    timeString = obj.start.getHours() + ':' + obj.start.getMinutes();
	    newData.scheduled_time = timeString;
	}
	Heading.update(newData);
    };
    // Callback for styling rendered events
    $scope.renderEvent = function(event, element) {
	// Verify if in active Scope
	if ($scope.activeFocusArea && $scope.activeFocusArea.id > 0) {
	    if (event.focus_areas.indexOf($scope.activeFocusArea.id) === -1) {
		return false;
	    }
	}
	// Repeating icon
	if (event.repeats) {
	    element.find('.fc-event-title')
		.append('<span class="repeat-icon"></span>');
	}
	if ($scope.activeCalendars.indexOf(event.calId) === -1) {
	    return false;
	}
    };
    // Callback for resizing events
    $scope.resizeEvent = function(event) {
	var newData, dateString, timeString;
	if (event.field_group === 'calendar') {
	    newData = {id: event.id};
	    dateString = event.end.getFullYear() + '-' + (event.end.getMonth() + 1) + '-' + event.end.getDate();
	    newData.end_date = dateString;
	    if (!event.allDay) {
		// Time-specific
		timeString = event.end.getHours() + ':' + event.end.getMinutes();
		newData.end_time = timeString;
	    }
	    Heading.update(newData);
	}
    };
    // Respond to changes in activeFocusArea
    $scope.$on('focus-area-changed', function(e, newFocusArea) {
	var i, newList;
	$scope.activeFocusArea = newFocusArea;
	console.error("Currently broken. Why does $scope.owCalendar not exist?");
	$scope.owCalendar.fullCalendar('rerenderEvents');
    });
    // Calendar config object
    $scope.calendarOptions = {
        editable: true,
        header:{
          left: 'month agendaWeek agendaDay',
          center: 'title',
          right: 'today prev,next'
        },
        eventClick: $scope.editEvent,
        eventDrop: $scope.moveEvent,
        eventResize: $scope.resizeEvent,
	eventRender: $scope.renderEvent,
    };
}
