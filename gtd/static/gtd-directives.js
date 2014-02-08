/*globals angular, $, ow_waiting, Aloha*/
"use strict";

var owDirectives = angular.module(
    'owDirectives',
    ['ngAnimate', 'ngResource']
);

/*************************************************
* Directive that turns checkboxes into switches
*
**************************************************/
owDirectives.directive('owSwitch', function() {
    function link(scope, element, attrs, model) {
	// Set switch state when model changes
	function formatter(value) {
	    element.bootstrapSwitch('setState', value);
	}
	model.$formatters.push(formatter);
	// Set model state when switch changes
	element.on('switch-change', function (e, data) {
	    if (!scope.$$phase) {
		scope.$apply(function() {
		    model.$setViewValue(data.value);
		});
	    }
	});
	// Attach switch plugin
	element.bootstrapSwitch();
    }
    return {
	link: link,
	require: '?ngModel',
    };
});

/*************************************************
* Directive that lets a user change the current
* active date for lists and inbox
*
**************************************************/
owDirectives.directive('owCurrentDate', function() {
    // Directive creates the pieces that allow the user to edit a heading
    function link($scope, $element, attrs) {
	var $input, set_strings;
	$input = $element.find('input');
	$scope.isEditable = false;
	// Set some strings for the DOM
	function set_strings(newDate) {
	    $scope.dateString = newDate.toDateString();
	    $scope.dateModel = newDate.ow_date();
	    return newDate;
	}
	// Setup the widget based on parent scope's current_date
	$scope.$watch('currentDate', function(newDate) {
	    return set_strings(newDate);
	}, true);
	// When the input loses focus, update the parent scope currentDate
	$input.on('blur', function() {
	    $scope.$apply(function() {
		var newDate;
		$scope.isEditable = false;
		newDate = new Date($scope.dateModel);
		if ( isNaN(newDate) ) {
		    // invalid date: reset values
		    set_strings($scope.currentDate);
		} else {
		    // Valid date: update parent scope (valid dates only)
		    $scope.currentDate.setDate(newDate.getUTCDate())
		    $scope.currentDate.setMonth(newDate.getUTCMonth())
		    $scope.currentDate.setYear(newDate.getUTCFullYear())
		}
	    });
	});
    }
    return {
	link: link,
	templateUrl: '/static/current-date.html',
	scope: true,
    };
});

/*************************************************
* Directive that lets a user edit a node
*
**************************************************/
owDirectives.directive('owEditable', ['$resource', function($resource) {
    // Directive creates the pieces that allow the user to edit a heading
    function link(scope, element, attrs) {
	var $text, heading, $save, Heading;
	// Initiate wait indicator
	ow_waiting();
	// Get the full fieldset
	Heading = $resource('/gtd/node/:id/', {id: '@id'});
	scope.fields = Heading.get({id: attrs.owNodeId});
	scope.fields.$promise.then(function() {
	    ow_waiting('clear');
	});
	scope.priorities = [{sym: 'A',
			     display: 'A - high'},
			    {sym: 'B',
			     display: 'B - medium (default)' },
			    {sym: 'C',
			     display: 'C - low'}];
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
	$('body').animate({scrollTop: element.offset().top - 27}, '500');
	// Focus on the title field
	element.find('#title').focus();
	// Event handlers for the editable dialog
	scope.save = function(e) {
	    // Tasks for when the user saves the edited heading
	    scope.fields.text = element.find('.edit-text')[0].innerHTML;
	    $.extend(scope.heading.fields, scope.fields);
	    scope.heading.update();
	    scope.heading.editable = false;
	    scope.heading.save();
	};
	scope.cancel_edit = function(e) {
	    // Handler for if an editable dialog is closed without saving
	    scope.heading.editable = false;
	    if ( scope.heading.pk === 0 ) {
		scope.heading.pk = -1;
	    }
	};
	// Attach aloha editor
	if ( typeof Aloha !== 'undefined' ) {
	    Aloha.ready( function() {
		Aloha.jQuery(element.find('.edit-text')).aloha();
	    });
	}
    }
    return {
	link: link,
	require: '?ngModel',
	templateUrl: '/static/editable.html'
    };
}]);

/*************************************************
* Directive that shows a list of Scopes tabs
*
**************************************************/
owDirectives.directive('owScopeTabs', ['$resource', function($resource) {
    // Directive creates tabs that allow a user to filter by scope
    function link(scope, element, attrs) {
	var Scope;
	// Set initial active scope tab
	element.find('[scope_id="'+scope.active_scope+'"]').addClass('active');
	scope.change_scope = function(ow_scope) {
	    var new_scope;
	    // User has requested a different scope
	    element.find('[scope_id="'+scope.active_scope+'"]').removeClass('active');
	    if ( ow_scope ) {
		scope.active_scope = ow_scope.id;
	    } else {
		scope.active_scope = 0;
	    }
	    element.find('[scope_id="'+scope.active_scope+'"]').addClass('active');
	};
    }
    return {
	link: link,
	templateUrl: '/static/scope-tabs.html'
    };
}]);

/*************************************************
* Directive that lets a user change the todo state
* with a popover menu
**************************************************/
owDirectives.directive('owTodo', ['$filter', function($filter) {
    // Directive creates the pieces that allow the user to edit a heading
    function link(scope, element, attrs) {
	var i, $span, $popover, $options, state, content, s, style;
	style = $filter('style');
	scope.heading.todo_popover = false;
	$span = element.children('span');
	if (scope.heading.todo_state) {
	    $span.tooltip({
		delay: {show:1000, hide: 100},
		title: scope.heading.todo_state.fields.display_text,
		placement: 'right'
	    });
	}
	function remove_popover($target) {
	    // Remove the popover
		element.popover('destroy');
	}
	function add_popover($target) {
	    // Create and attach popover
	    $('body').append('<div id="todo-popover"></div>');
	    content = '<div class="todo-option" todo_id=""';
	    if ( scope.heading.fields.todo_state === null ) {
		content += ' selected';
	    }
	    content += '>[None]</div>\n';
	    for ( i=0; i<scope.todo_states.length; i+=1 ) {
		state = scope.todo_states[i];
		s = '<div class="todo-option" todo_id="' + state.pk + '"';
		s += 'style="' + style(state) + '"';
		if ( state.pk === scope.heading.fields.todo_state ) {
		    s += ' selected';
		}
		s += '>' + state.fields.abbreviation + '</div>\n';
		content += s;
	    }
	    $target.popover({
		title: 'Todo State',
		content: content,
		html: true,
		container: '#todo-popover'
	    });
	    $target.popover('show');
	    // Bind to click events for clearing the popover
	    $('body').on('click.todo_state', function(e) {
		if ( ! $(e.target).hasClass('todo-state') ) {
		    $target.popover('destroy');
		}
	    });
	    // Bind to click event for todo state options
	    $options = $('.todo-option').not('[selected]');
	    $options.on('click.todostate', function(e) {
		scope.$apply( function() {
		    var new_todo_id = $(e.target).attr('todo_id');
		    if ( new_todo_id === '' ) {
			scope.heading.fields.todo_state = null;
		    } else {
			scope.heading.fields.todo_state = parseInt(new_todo_id, 10);
		    }
		    scope.heading.update();
		    scope.heading.just_modified = true;
		    scope.heading.save({ auto: true });
		    remove_popover($target);
		});
	    });
	}
	$span.on('click', function(e) {
	    add_popover($span);
	});
    }
    return {
	link: link,
	templateUrl: '/static/todo-state-selector.html',
    };
}]);

/*************************************************
* Directive sets the parameters of next
* actions table row
**************************************************/
owDirectives.directive('owListRow', function() {
    function link(scope, element, attrs) {
	var node_pk, $element;
	$element = $(element);
	// Determine bootstrap row style based on overdue status
	scope.$watch(
	    function() {return scope.heading.fields.deadline_date;},
	    function() {
		var row_cls, due;
		due = scope.heading.due();
		if ( due === null ) {
		    row_cls = '';
		} else if ( due <= 0 ) {
		    row_cls = 'overdue';
		} else if ( due > 0 ) {
		    row_cls = 'upcoming';
		}
		element.addClass(row_cls);
	    }
	);
	// CSS class based on archived status
	scope.$watch(
	    'heading.fields.archived',
	    function(archived) {
		if (archived) {
		    element.addClass('archived');
		}
	    }
	);
	// CSS class based on priority
	scope.$watch(
	    'heading.fields.priority',
	    function(new_priority, old_priority) {
		// Remove old CSS class
		if (old_priority) {
		    element.removeClass('priority-' + old_priority);
		}
		// And add new one
		if (new_priority) {
		    element.addClass('priority-' + new_priority);
		}
	    }
	);
	// Handlers for action buttons
	scope.edit = function(h) {
	    h.editable = true;
	};
    }
    return {
	link: link,
	scope: true,
    };
});
