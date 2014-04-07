/*globals angular, $, Aloha, tinyMCE, tinymce*/
"use strict";

var owDirectives = angular.module(
    'owDirectives',
    ['ngAnimate', 'ngResource', 'owServices']
);

/*************************************************
* Directive that handles persona buttons for both
* logging in an logging out
**************************************************/
owDirectives.directive('personaButton', ['personaNavigator', 'personaUser', function(personaNavigator, personaUser) {
    function link(scope, element, attrs) {
	element.on('click', function() {
	    if ( attrs.personaButton === 'login' ) {
		personaNavigator.id.request();
	    } else {
		personaNavigator.id.logout();
	    }
	});
    }
    return {
	restrict: 'AC',
	link: link
    };
}]);

/*************************************************
* Directive that turns checkboxes into switches
*
**************************************************/
owDirectives.directive('owSwitch', function() {
    function link($scope, $element, attrs, model) {
	var $input;
	$input = $element.find('input');
	// Set switch state when model changes
	function formatter(value) {
	    $input.bootstrapSwitch('setState', value);
	}
	model.$formatters.push(formatter);
	// Set model state when switch changes (compare to $modelValue)
	$input.on('switch-change', function (e, data) {
	    if (data.value !== model.$modelValue) {
		$scope.$apply(function() {
		    model.$setViewValue(data.value);
		});
	    }
	});
	// Attach switch plugin
	$input.bootstrapSwitch();
    }
    return {
	link: link,
	require: '?ngModel',
    };
});

/*************************************************
* Directive modifies the DOM after calls to
* waitIndicator service
*
**************************************************/
owDirectives.directive('owWaitFeedback', ['owWaitIndicator', function(owWaitIndicator) {
    // Directive creates the pieces that allow the user to edit a heading
    function link($scope, $element, attrs) {
	var $mask;
	$mask = $element.find('.mask');
	$mask.hide();
	$element.hide();
	// Respond to each waiting list by showing the appropriate setting
	$scope.$watchCollection(
	    function() { return owWaitIndicator.waitLists.quick.length; },
	    function(newLength) {
		if (newLength > 0) {
		    $element.show();
		} else {
		    $element.hide();
		}
	    }
	);
	$scope.$watchCollection(
	    function() { return owWaitIndicator.waitLists.medium.length; },
	    function(newLength) {
		if (newLength > 0) {
		    $element.show();
		    $mask.show();
		} else {
		    $element.hide();
		    $mask.hide();
		}
	    }
	);
    }
    return {
	link: link,
	scope: {},
    };
}]);

/*************************************************
* Directive that lets a user change the current
* active date for lists and inbox
*
**************************************************/
owDirectives.directive('owCurrentDate', function() {
    // Directive creates the pieces that allow the user to edit a heading
    function link($scope, $element, attrs) {
	var $input;
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
		    $scope.currentDate.setDate(newDate.getUTCDate());
		    $scope.currentDate.setMonth(newDate.getUTCMonth());
		    $scope.currentDate.setYear(newDate.getUTCFullYear());
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
* Directive that lets a user edit a node.
* The ow-heading attr indicates that heading is
* being edited. The ow-parent attr indicates this
* is a new child.
*
**************************************************/
owDirectives.directive('owDetails', ['$timeout', '$rootScope', function($timeout, $rootScope) {
    function link(scope, element, attrs) {
	var i;
	scope.editorId = 'edit-text-' + scope.heading.id;
	scope.heading.$get()
	    .then(function(newHeading) {
		var areaName, f;
		scope.headingText = newHeading.text;
		// Build list of focus area names
		scope.focusAreas = [];
		f = function(scp) {return scp.id === newHeading.scope[i];};
		for (i=0; i<newHeading.scope.length; i+=1) {
		    areaName = $rootScope.scopes.filter(f)[0].display;
		    scope.focusAreas.push(areaName);
		}
	    });
	$timeout(function() {
	    if ( typeof tinymce !== 'undefined' ) {
		tinymce.init({
		    plugins: 'charmap fullscreen hr image link table textcolor',
		    toolbar: 'undo redo | fullscreen | styleselect | bold italic forecolor backcolor superscript subscript | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | hr link image',
		    inline: true,
		    tools: 'inserttable',
		    mode: 'exact',
		    elements: scope.editorId,
		    setup: function(editor) {
			editor.on('change', function(e) {
			    scope.$apply(function() {
				scope.heading.text = editor.getContent();
				scope.heading.$update();
			    });
			});
		    }
		});
	    }
	});
	scope.editText = function(e) {
	    e.stopPropagation();
	    scope.textIsEditable = true;
	    scope.textEditStatus = '';
	};
	scope.stopEditingText = function() {
	    scope.textIsEditable = false;
	    if ( typeof tinymce !== 'undefined' ) {
		tinymce.remove('#' + scope.editorId);
	    }
	};
    }
    return {
	link: link,
	scope: { heading: '=owHeading' },
	templateUrl: '/static/details.html'
    };
}]);

/*************************************************
* Directive that lets a user edit a node.
* The ow-heading attr indicates that heading is
* being edited. The ow-parent attr indicates this
* is a new child.
*
**************************************************/
owDirectives.directive('owEditable', ['$resource', '$rootScope', '$timeout', 'owWaitIndicator', 'Heading', 'todoStates', 'notify', function($resource, $rootScope, $timeout, owWaitIndicator, Heading, todoStates, notify) {
    // Directive creates the pieces that allow the user to edit a heading
    function link(scope, element, attrs) {
	var defaultParent, $text, heading, $save, heading_id, parent, editorId;
	scope.scopes = $rootScope.scopes;
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
		owWaitIndicator.end_wait('editable');
	    });
	} else if ( scope.parent ) {
	    // Else inherit some attributes from parent...
	    scope.fields.scope = scope.parent.scope;
	    scope.fields.priority = scope.parent.priority;
	    scope.fields.parent = scope.parent.id;
	} else {
	    // ...or use defaults if no parent
	    scope.fields.scope = [];
	    scope.fields.priority = 'B';
	}
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
	$('html').animate({scrollTop: element.offset().top - 27}, '500');
	// Focus on the title field
	element.find('#title').focus();
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
		notify('Saved', 'success');
		scope.$emit('finishEdit', newHeading);
	    })['catch'](function(e) {
		notify('<strong>Not saved!</strong> Check your internet connection and try again.', 'danger');
		console.log('Save failed:');
		console.log(e);
	    });
	};
	scope.cancelEdit = function(e) {
	    scope.$emit('finishEdit');
	};
    }
    return {
	link: link,
	scope: {
	    heading: '=owHeading',
	    parent: '=owParent',
	},
	require: '?ngModel',
	templateUrl: '/static/editable.html'
    };
}]);

/*************************************************
* Directive that shows a list of Scopes tabs.
* When a tab is clicked, this directive emits the
* 'scope-changed' signal via the scope's $emit()
* method with the new scope as the first argument.
*
**************************************************/
owDirectives.directive('owScopeTabs', ['$resource', '$rootScope', '$timeout', function($resource, $rootScope, $timeout) {
    // Directive creates tabs that allow a user to filter by scope
    function link(scope, element, attrs) {
	var nullScope = {
	    id: 0,
	    display: 'All'
	};
	scope.owScopes = [nullScope].concat($rootScope.scopes);
	scope.activeScope = nullScope;
	$timeout(function() {
	    element.find('#scope-tab-0').addClass('active');
	});
	// Tab click handler
	scope.changeScope = function(newScope) {
	    var emittedScope;
	    // User has requested a different scope
	    element.find('#scope-tab-' + scope.activeScope.id).removeClass('active');
	    scope.activeScope = newScope;
	    element.find('#scope-tab-' + scope.activeScope.id).addClass('active');
	    // Send the relevant signals
	    emittedScope = newScope.id ? newScope : null;
	    scope.$emit('scope-changed', emittedScope);
	};
    }
    return {
	link: link,
	scope: {},
	templateUrl: '/static/scope-tabs.html'
    };
}]);

/*************************************************
* Directive that lets a user change the todo state
* with a popover menu
**************************************************/
owDirectives.directive('owTodo', ['$rootScope', '$filter', 'todoStates', 'notify', function($rootScope, $filter, todoStates, notify) {
    // Directive creates the pieces that allow the user to edit a heading
    function link(scope, element, attrs) {
	var i, $span, $popover, $options, state, content, s, isInitialized;
	element.addClass("todo-state-widget");
	scope.todoState = todoStates.getState(scope.heading.todo_state);
	scope.todoStateId = scope.heading.todo_state;
	scope.$watch('todoStateId', function(newStateId, oldStateId) {
	    // When the todoStateId changes (by user action)
	    if (newStateId !== scope.heading.todo_state) {
		var oldDate;
		scope.heading.todo_state = parseInt(newStateId, 10);
		scope.todoState = todoStates.getState(scope.heading.todo_state);
		scope.heading.auto_update = true;
		oldDate = scope.heading.scheduled_date;
		scope.heading.$update()
		    .then(function(data) {
			if (data.scheduled_date !== oldDate) {
			    // Notify the user that the heading is rescheduled
			    var s = 'Rescheduled for ';
			    s += data.scheduled_date;
			    notify(s, 'info');
			}
		    })['catch'](function(e) {
			notify('<strong>Not saved!</strong> Check your internet connection and try again.', 'danger');
			console.log('Save failed:');
			console.log(e);
		    });
	    }
	});
	scope.$watch(
	    function() { return scope.heading.todo_state; },
	    function(newHeadingStateId) {
		if (newHeadingStateId !== scope.todoStateId) {
		    scope.todoState = todoStates.getState(scope.heading.todo_state);
		    scope.todoStateId = newHeadingStateId;
		}
		// Attach a tooltip with the states text
		if (scope.todoState) {
		    element.tooltip({
			delay: {show:1000, hide: 100},
			title: scope.todoState.display_text,
		    });
		}
	    }
	);
    }
    function compile(cElement, cAttrs) {
	// Create the <option> element for each todoState
	var select, i, h, todoState;
	select = cElement.find('select');
	for (i=0; i<todoStates.length; i+=1) {
	    todoState = todoStates[i];
	    h = '<option value="' + todoState.id + '" ';
	    h += 'style="' + $filter('todoStateStyle')(todoState) + '">';
	    h += todoState.abbreviation + '</option>';
	    select.append(h);
	}
	return link;
    }
    return {
	compile: compile,
	scope: {
	    heading: '=owHeading'
	},
	templateUrl: '/static/todo-state-selector.html',
    };
}]);

/*************************************************
* Directive forms a node in an outline (and takes
* care of any child nodes).
*
**************************************************/
owDirectives.directive('owTwisty', ['$compile', '$rootScope', 'Heading', function($compile, $rootScope, Heading) {
    function link(scope, element, attrs) {
	var hoverable, get_children;
	scope.isEditing = false;
	scope.loadedChildren = false;
	scope.state = 0;
	element.addClass('state-'+scope.state);
	scope.showArchived = $rootScope.showArchived;
	// Get todo-states
	if ($rootScope.todoStates) {
	    scope.todoStates = $rootScope.todoStates;
	} else {
	    scope.todoStates = [];
	}
	if ( scope.todoState && scope.todoState.actionable ) {
	    element.find('.ow-hoverable').addClass('actionable');
	}
	scope.$on('toggle-archived', function(e, newState) {
	    scope.showArchived = newState;
	});
	if ( scope.heading.level === 0 ) {
	    element.find('.ow-hoverable').addClass('project');
	}
	element.addClass('heading');
	hoverable = element.children('.ow-hoverable');
	// Process tag_string into tags
	scope.tags = scope.heading.tag_string.slice(1, -1).split(':');
	// Test for expandability
	scope.$watch(
	    'heading.rght - heading.lft',
	    function(newDiff) {
		if (newDiff > 1) {
		    hoverable.removeClass('leaf-node');
		    scope.isLeafNode = false;
		} else {
		    hoverable.addClass('leaf-node');
		    scope.isLeafNode = true;
		}
	    }
	);
	// Handler for getting the children of this heading
	scope.getChildren = function() {
	    if (!scope.loadedChildren) {
		scope.children = Heading.query({parent_id: scope.heading.id,
						field_group: 'outline'});
		scope.children.$promise.then(function(headings) {
		    scope.numArchived = headings.filter(function(obj) {
			return obj.archived === true;
		    }).length;
		    scope.loadedChildren = true;
		});
	    }
	};
	scope.$on('open-descendants', function(e) {
	    if (e.targetScope !== e.currentScope) {
		scope.toggleHeading(1);
	    }
	});
	// Get children if this is not a root level node
	if (scope.heading.level > 0) {
	    scope.getChildren();
	}
	// Handlers for clicking on the heading (may be overridden by components)
	scope.toggleHeading = function(newState) {
	    element.removeClass('state-' + scope.state);
	    if ( /^\d+$/.test(newState) ) {
		// Specific state is passed as an integer
		scope.state = newState % 3;
	    }
	    else if ($(newState.target).is(':not(.non-opening)')) {
		// Verify that something should be toggled
		scope.state = (scope.state + 1) % 3;
		// Skip state 1 for leaf nodes
		if (scope.isLeafNode && scope.state === 1) {
		    scope.state = 2;
		}
	    }
	    element.addClass('state-' + scope.state);
	    // Get children if heading is now open
	    if (scope.state > 0) {
		scope.getChildren();
	    }
	    if (scope.state === 2) {
		scope.$broadcast('open-descendants');
	    }
	};
	// Handler for clicking the "edit" button
	scope.edit = function(e) {
	    var $off;
	    e.stopPropagation();
	    scope.isEditing = true;
	    $off = scope.$on('finishEdit', function(event, newHeading) {
		// Emitted by the owEditable when hiding the editable
		scope.isEditing = false;
		event.stopPropagation();
		if ( newHeading ) {
		    // Update existing heading
		    angular.extend(scope.heading, newHeading);
		    if ( scope.heading.todo_state ) {
			scope.todoState = scope.todoStates.filter(function(state) {
			    return state.id === scope.heading.todo_state;
			})[0];
		    } else {
			scope.todoState = null;
		    }
		}
		$off();
	    });
	};
	// Handler for clicking the "new child" button
	scope.createChild = function(e) {
	    var $off;
	    e.stopPropagation();
	    // Open the twisty if necessary
	    if ( scope.state === 0 ) {
		scope.toggleHeading(1);
	    }
	    scope.newChild = true;
	    $off = scope.$on('finishEdit', function(event, newHeading) {
		// Emitted by the owEditable when hiding the editable
		scope.newChild = false;
		event.stopPropagation();
		if ( newHeading ) {
		    // Add new child to the list
		    scope.children.push(newHeading);
		}
		$off();
	    });
	};
	// Handler for toggling the visibility (archive) of a node
	scope.archive = function(e) {
	    e.stopPropagation();
	    scope.heading.archived = !scope.heading.archived;
	    scope.heading.$update();
	};
    }
    // Special compile function that avoids a recursive dead-lock
    function compile(tElement, tAttr) {
        var compiledContents, contents;
        contents = tElement.contents().remove();
        return function(scope, iElement, iAttr) {
            if(!compiledContents) {
                compiledContents = $compile(contents);
            }
            compiledContents(scope, function(clone, scope) {
                iElement.append(clone);
		// Now call our own link function
		link(scope, iElement, iAttr);
            });
        };
    }
    return {
	// link: link,
	compile: compile,
	templateUrl: '/static/outline-twisty.html',
	scope: {
	    heading: '=owHeading',
	},
    };
}]);

/*************************************************
* Directive sets the parameters of next
* actions table row
**************************************************/
owDirectives.directive('owListRow', ['$rootScope', 'todoStates', '$filter', function($rootScope, todoStates, $filter) {
    function link(scope, element, attrs) {
	var node_pk, $element;
	$element = $(element);
	element.addClass("heading-row");
	element.addClass('priority' + (scope.heading.priority || 'B'));
	// Get heading's todoState
	scope.todoState = todoStates.getState(scope.heading.todo_state);
	// Determine bootstrap row style based on overdue status
	scope.$watch(
	    function() {return scope.heading.deadline_date;},
	    function(newDeadline) {
		var row_cls, due, today, deadline;
		due = null;
		if ( newDeadline ) {
		    today = new Date();
		    deadline = new Date(newDeadline);
		    scope.owDate = $filter('deadline_str')(newDeadline);
		    due = deadline - today;
		}
		element.removeClass('overdue');
		element.removeClass('upcoming');
		if ( due === null ) {
		    row_cls = '';
		} else if ( due <= 0 ) {
		    row_cls = 'overdue';
		} else if ( 7*86400000 > due > 0 ) {
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
	scope.edit = function() {
	    var $off;
	    scope.isEditable = true;
	    $off = scope.$on('finishEdit', function(e) {
		scope.isEditable = false;
		$off();
	    });
	};
	// Response when user edits the heading
	scope.$on('finishEdit', function(e, newHeading) {
	    e.stopPropagation();
	    angular.extend(scope.heading, newHeading);
	});
    }
    return {
	link: link,
	scope: {
	    heading: '=owHeading',
	},
	templateUrl: '/static/actions-list-row.html',
    };
}]);
