"use strict";

import EasyMDE from 'easymde';

import "angular";
import "angular-animate";
import "angular-resource";
import 'bootstrap/dist/js/bootstrap.js';

angular.module('orgwolf.gtd')
    .directive('owEditable', owEditable);


owEditable.$inject = ['$resource', '$rootScope', '$timeout', 'owWaitIndicator', 'Heading', 'todoStates', 'focusAreas', 'priorities', 'toaster', 'toDateObjFilter', 'decodeHtmlFilter'];


function owEditable($resource, $rootScope, $timeout, owWaitIndicator, Heading, todoStates, focusAreas, priorities, toaster, toDateObjFilter, decodeHtml) {
    /*************************************************
     * Directive that lets a user edit a node.
     * The ow-heading attr indicates that heading is
     * being edited. The ow-parent attr indicates this
     * is a new child.
     *
     **************************************************/

    // Directive creates the pieces that allow the user to edit a heading
    function link(scope, element, attrs) {
	var defaultParent, $text, heading, $save, $titleInput, heading_id, parent, editorId;
	scope.focusAreas = focusAreas;
	scope.todoStates = todoStates;
	scope.fields = {};
	element.addClass('ow-editable'); // For animations
	// Set some initial field values
	if ( scope.heading ) {
	    // Get the full fieldset if an existing heading is being edited
	    // Initiate wait indicator
	    owWaitIndicator.start_wait('quick', 'editable');
	    // Retrieve object from API
	    scope.fields = Heading.get({id: scope.heading.id});
	    scope.fields.$promise.then(function() {
		var field, dateFields, i;
		owWaitIndicator.end_wait('editable');
		dateFields = ['scheduled_date', 'deadline_date', 'end_date']
		// Cycle through each field and convert the date
		for (i=0; i<dateFields.length; i+=1) {
		    field = dateFields[i];
		    scope.fields[field] = toDateObjFilter(scope.fields[field]);
		}
		// Unescape the HTML so we can edit it
		scope.fields['text'] = decodeHtml(scope.fields['text']);
	    });
	} else if ( scope.parent ) {
	    // Initiate wait indicator
	    owWaitIndicator.start_wait('quick', 'editable');
	    // Refresh the parent object with more fields
	    scope.parent = Heading.get({id: scope.parent.id});
	    scope.parent.$promise.then(function() {
		var field, dateFields, i;
		owWaitIndicator.end_wait('editable');
		dateFields = ['scheduled_date', 'deadline_date', 'end_date']
		// Inherit some attributes from parent...
		scope.fields.focus_areas = scope.parent.focus_areas;
		scope.fields.priority = scope.parent.priority;
		scope.fields.parent = scope.parent.id;
		scope.fields.deadline_date = scope.parent.deadline_date;
		scope.fields.deadline_time = scope.parent.deadline_time;
		scope.fields.scheduled_date = scope.parent.scheduled_date;
		scope.fields.scheduled_time = scope.parent.scheduled_time;
		scope.fields.text = '';
		scope.fields.title = '';
		// Cycle through each field and convert the date
		for (i=0; i<dateFields.length; i+=1) {
		    field = dateFields[i];
		    scope.fields[field] = toDateObjFilter(scope.fields[field]);
		}
	    });
	} else {
	    // ...or use defaults if no parent
	    scope.fields.focus_areas = [];
	    scope.fields.priority = 'C';
	    scope.fields.text = '';
	    scope.fields.title = '';
	    // Set Scope if a tab is active
	    if ($rootScope.activeFocusArea && $rootScope.activeFocusArea.id > 0) {
		scope.fields.focus_areas.push($rootScope.activeFocusArea.id);
	    }
	}
	scope.priorities = priorities;
	scope.time_units = [
	    {value: 'd', label: 'Days'},
	    {value: 'w', label: 'Weeks'},
	    {value: 'm', label: 'Months'},
	    {value: 'y', label: 'Years'},
	];
	// Option for repeats_from_completion field
	scope.repeat_schemes = [
	    {value: false, label: 'scheduled date'},
	    {value: true, label: 'completion date'},
	];
	$text = element.find('.edit-text');
	$save = element.find('#edit-save');
	// Scroll so element is in view
	$('html').animate({scrollTop: element.offset().top - 27}, '500');
	// Event handlers for the editable dialog
	scope.save = function(e) {
	    var newHeading;
	    // When the user saves the edited heading
	    if ( scope.heading ) {
		newHeading = Heading.update(scope.fields);
	    } else {
		newHeading = Heading.create(scope.fields);
	    }
	    newHeading.$promise.then(function(data) {
	    	scope.endEdit(newHeading);
	    });
	};
	// Prepare the markdown editor
	var textArea = element.find('.edit-text');
	if ($(textArea).length > 0) {
	    scope.editor = new EasyMDE({
		element: $(textArea)[0],
	    });
	    scope.editor.codemirror.on("change", function() {
		// Save the heading text when changed
		if (scope.fields.text != scope.editor.value()) {
		    scope.fields.text = scope.editor.value();
		    scope.$apply();
		}
	    });
	    scope.$watch('fields.text', function(newText, oldText, currScope) {
		// Update the editor when the model changes
		if (currScope.editor.value() != newText) {
		    currScope.editor.value(newText);
		}
	    });
	} // end of markdown editor preparation
	// Process the callbacks for when editing is done
	scope.cancelEdit = function(e) {
	    scope.endEdit(null);
	};
	scope.endEdit = function(newHeading) {
	    scope.$emit('finishEdit', newHeading);
	    scope.$parent.$parent.$eval(scope.finishCallback);
	};
	// Focus the title element so it can be edited
	$titleInput = element.find('#title');
	if ( scope.fields.title == '' ) {
	    $titleInput.focus();
	}
    }
    return {
	link: link,
	scope: {
	    heading: '=owHeading',
	    parent: '=owParent',
	    finishCallback: '@owEditFinish',
	},
	require: '?ngModel',
	templateUrl: '/static/editable.html'
    };
}
