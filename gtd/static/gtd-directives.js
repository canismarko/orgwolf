/*globals angular, $, Aloha, tinyMCE, tinymce*/
"use strict";

var owDirectives = angular.module(
    'owDirectives',
    ['ngAnimate', 'ngResource', 'owServices']
);

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
owDirectives.directive('owEditable', ['$resource', '$rootScope', '$timeout', 'owWaitIndicator', 'Heading', function($resource, $rootScope, $timeout, owWaitIndicator, Heading) {
    // Directive creates the pieces that allow the user to edit a heading
    function link(scope, element, attrs) {
	var defaultParent, $text, heading, $save, heading_id, parent, editorId;
	scope.scopes = $rootScope.scopes;
	scope.todo_states = $rootScope.todo_states;
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
	    scope.fields.text = tinyMCE.get(scope.editorId).getContent();
	    if ( scope.heading ) {
		newHeading = Heading.update(scope.fields);
	    } else {
		newHeading = Heading.create(scope.fields);
	    }
	    newHeading.$promise.then(function() {
		scope.$emit('finishEdit', newHeading);
	    });
	};
	scope.cancel_edit = function(e) {
	    scope.$emit('finishEdit');
	};
	// Attach TinyMCE4 WYSIWYG editor
	if( scope.heading ) {
	    scope.editorId = 'edit-text-' + scope.heading.id;
	} else if ( scope.parent ) {
	    scope.editorId = 'edit-text-child-' + scope.parent.id;
	} else {
	    scope.editorId = 'edit-text-new-project';
	}
	$timeout(function() {
	    tinymce.init({
		plugins: 'charmap fullscreen hr image link table textcolor',
		toolbar: 'undo redo | fullscreen | styleselect | bold italic forecolor backcolor superscript subscript | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | hr link image',
		tools: 'inserttable',
		mode: 'exact',
		elements: scope.editorId,
	    });
	    // Set TinyMCE4 content if source data changes
	    scope.$watch('fields.text', function(newText) {
		var editor = tinyMCE.get(scope.editorId);
		if (newText && editor) {
		    editor.setContent(newText);
		}
	    });
	});
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
* Directive that shows a list of Scopes tabs
*
**************************************************/
owDirectives.directive('owScopeTabs', ['$resource', '$rootScope', function($resource, $rootScope) {
    // Directive creates tabs that allow a user to filter by scope
    function link(scope, element, attrs) {
	scope.owScopes = $rootScope.scopes;
	var owScope;
	// Set initial active scope tab
	element.find('[scope_id="'+scope.activeScope+'"]').addClass('active');
	scope.changeScope = function(newScope) {
	    console.log(newScope);
	    // User has requested a different scope
	    element.find('[scope_id="'+scope.activeScope+'"]').removeClass('active');
	    scope.activeScope = newScope ? newScope.id : 0;
	    if ( newScope ) {
	    	scope.activeScope = newScope.id;
	    } else {
	    	scope.activeScope = 0;
	    }
	    element.find('[scope_id="'+scope.activeScope+'"]').addClass('active');
	};
    }
    return {
	link: link,
	scope: {
	    activeScope: '=activeScope'
	},
	templateUrl: '/static/scope-tabs.html'
    };
}]);

/*************************************************
* Directive that lets a user change the todo state
* with a popover menu
**************************************************/
owDirectives.directive('owTodo', ['todoStateStyleFilter', function(styleFilter) {
    // Directive creates the pieces that allow the user to edit a heading
    function link(scope, element, attrs) {
	var i, $span, $popover, $options, state, content, s;
	// style = $filter('style');
	scope.heading.todo_popover = false;
	$span = element.children('span');
	if (scope.heading.todo_state) {
	    $span.tooltip({
		delay: {show:1000, hide: 100},
		title: scope.heading.todo_state.display_text,
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
		s = '<div class="todo-option" todo_id="' + state.id + '"';
		s += 'style="' + styleFilter(state) + '"';
		if ( state.id === scope.heading.fields.todo_state ) {
		    s += ' selected';
		}
		s += '>' + state.abbreviation + '</div>\n';
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
* Directive forms a node in an outline (and takes
* care of any child nodes).
*
**************************************************/
owDirectives.directive('owTwisty', ['$compile', '$rootScope', 'Heading', function($compile, $rootScope, Heading) {
    function link(scope, element, attrs) {
	var hoverable, get_children;
	scope.isEditing = false;
	scope.loadedChildren = false;
	scope.isOpen = false;
	scope.showArchived = $rootScope.showArchived;
	scope.$on('toggle-archived', function(e, newState) {
	    scope.showArchived = newState;
	});
	element.addClass('heading');
	hoverable = element.children('.ow-hoverable');
	// Process tag_string into tags
	scope.tags = scope.heading.tag_string.slice(1, -1).split(':');
	// Test for expandability
	if (scope.heading.text) {
	    hoverable.addClass('expandable');
	} else if ((scope.heading.rght - scope.heading.lft) > 1) {
	    // MPTT fields suggest expandability
	    hoverable.addClass('lazy-expandable');
	} else {
	    hoverable.addClass('not-expandable');
	}
	// Handlers for clicking on the heading (may be overridden by components)
	scope.toggleHeading = function(newState) {
	    if ( newState === 'open' ) {
		scope.isOpen = true;
		element.addClass('open');
	    } else {
		element.toggleClass('open');
		scope.isOpen = !scope.isOpen;
	    }
	    // Get children if not already done
	    if (!scope.loadedChildren) {
		scope.children = Heading.query({parent_id: scope.heading.id});
		scope.children.$promise.then(function() {
		    scope.numArchived = scope.children.filter_by({archived: true}).length;
		    scope.loadedChildren = true
		});
	    }
	};
	// Hanlder for clicking the "edit" button
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
		}
		$off();
	    });
	};
	// Handler for clicking the "new child" button
	scope.createChild = function(e) {
	    var $off;
	    e.stopPropagation();
	    scope.toggleHeading('open');
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
        var contents = tElement.contents().remove();
        var compiledContents;
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
