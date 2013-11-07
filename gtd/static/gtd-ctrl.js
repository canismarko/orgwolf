/*globals document, $, jQuery, document, Aloha, window, alert, GtdHeading, HeadingManager, angular*/
"use strict";
var test_headings;

/*************************************************
* Angular module for all GTD components
*
**************************************************/
var gtd_module = angular.module('orgWolf',
				['ngAnimate', 'ngResource', 'ngSanitize']);
gtd_module.config(function($httpProvider) {
    // Add custom headers to $http objects
    $httpProvider.defaults.headers.common['X-Request-With'] = 'XMLHttpRequest';
    // Add django CSRF token to all jQuery.ajax() requests
    function getCookie(name) {
	var cookieValue, cookies, i, cookie;
	cookieValue = null;
	if (document.cookie && document.cookie !== '') {
            cookies = document.cookie.split(';');
            for (i = 0; i < cookies.length; i += 1) {
		cookie = jQuery.trim(cookies[i]);
		// Does this cookie string begin with the name we want?
		if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(
			cookie.substring(name.length + 1)
		    );
                    break;
		}
            }
	}
	return cookieValue;
    }
    var csrftoken = getCookie('csrftoken');
    $.ajaxSetup({
	beforeSend: function(xhr) {
	    xhr.setRequestHeader('X-CSRFToken', csrftoken);
	}
    });
});

/*************************************************
* Factory creates GtdHeading objects
*
**************************************************/
gtd_module.factory('OldHeading', function($resource, $http) {
    return function(data) {
        return new GtdHeading(data);
    }
});
gtd_module.factory('Heading', function($resource, $http) {
    var res = $resource(
    	'/gtd/node/:pk/:slug/',
    	{id: '@id', slug: '@fields.slug'},
    	{
    	    'query': {
    		method: 'GET',
    		transformResponse: $http.defaults.transformResponse.concat([
		    function (data, headersGetter) {
    			var i, new_heading;
    			for ( i=0; i<data.length; i+=1 ) {
    		    	    new_heading = new GtdHeading(data[i]);
    		    	    jQuery.extend(data[i], new_heading);
    			}
    			return data;
    		    }
		]),
    		isArray: true
    	    },
    	}
    );
    return res;
});

/*************************************************
* Filter that determines object color
*
**************************************************/
gtd_module.filter('style', function() {
    return function(obj) {
	var style, c, colors, color_i;
	style = '';
	if (obj === null || obj === undefined) {
	    style = null;
	} else if ( obj.model === 'gtd.todostate' ) {
	    // First decode color into rgb
	    c = {};
	    c.RED_OFFSET = 16; // in bits
	    c.GREEN_OFFSET = 8;
	    c.BLUE_OFFSET = 0;
	    c.RED_MASK = 0xFF0000;
	    c.GREEN_MASK = 0x00FF00;
	    c.BLUE_MASK = 0x0000FF;
	    /*jslint nomen: true*/
	    /*jslint bitwise: true*/
	    c.red = (obj.fields._color_rgb & c.RED_MASK) >> c.RED_OFFSET;
	    c.green = (obj.fields._color_rgb & c.GREEN_MASK) >> c.GREEN_OFFSET;
	    c.blue = (obj.fields._color_rgb & c.BLUE_MASK) >> c.BLUE_OFFSET;
	    style += 'color: rgba(' + c.red + ', ' + c.green + ', ' + c.blue;
	    style += ', ' + obj.fields._color_alpha + '); ';
	    if ( obj.fields.actionable ) {
		style += 'font-weight: bold; ';
	    }
	    /*jslint nomen: false*/
	    /*jslint bitwise: false*/
	} else if ( obj.model === 'gtd.node' ) {
	    // Determine color based on node.rank
	    colors = ['rgb(88, 0, 176)', 'rgb(80, 0, 0)', 'rgb(0, 44, 19)',
		      'teal', 'slateblue', 'brown'];

	    color_i = (obj.fields.level) % colors.length;
	    style += 'color: ' + colors[color_i] + '; ';
	}
	return style;
    };
});

/*************************************************
* Sanitizes text to safe HTML
*
**************************************************/
gtd_module.filter('asHtml', function($sce) {
    return function(obj) {
	var s = $sce.trustAsHtml(obj);
	return s;
    };
});

/*************************************************
* Filter that orders top level headings
*
**************************************************/
gtd_module.filter('order', function($sce) {
    return function(obj, criterion) {
	return obj.order_by(criterion);
    };
});

/*************************************************
* Directive that lets a user edit a node
*
**************************************************/
gtd_module.directive('owEditable', function() {
    // Directive creates the pieces that allow the user to edit a heading
    function link(scope, element, attrs) {
	var $text, heading, $save;
	scope.fields = jQuery.extend(true, {}, scope.heading.fields);
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
	// Convert checkboxes to switches
	element.find('.make-switch').each(function() {
	    var field;
	    field = $(this).find('input').attr('ng-model').split('.')[1];
	    $(this).bootstrapSwitch();
	    $(this).bootstrapSwitch('setState', scope.fields[field]);
	});
	element.find('.make-switch').on('switch-change', function(e, data) {
	    var field;
	    field = $(e.target).find('input').attr('ng-model').split('.')[1];
	    scope.fields[field] = data.value;
	});
	// Attach datepicker and timepicker
	element.find('.datepicker').datepicker({
	    format: 'yyyy-mm-dd',
	});
	element.find('.timepicker').timepicker({
	    showMeridian: false,
	    showSeconds: true,
	});
	// Kludge fix for date/time pickers not updateing angular model
	element.find('.timepicker,.datepicker').on('change', function(e) {
	    var $target, field;
	    $target = $(e.target);
	    field = $target.attr('ng-model').split('.')[1];
	    scope.fields[field] = $target.val();
	});
	// Event handlers for the editable dialog
	scope.save = function(e) {
	    // Tasks for when the user saves the edited heading
	    scope.fields.text = element.find('.edit-text')[0].innerHTML;
	    scope.heading.fields = scope.fields;
	    scope.heading.update();
	    scope.heading.editable = false;
	    scope.heading.save();
	};
	scope.cancel_edit = function(e) {
	    scope.heading.editable = false;
	    if ( scope.heading.pk === 0 ) {
		// Heading is not in the database so remove from views
		scope.headings.delete(scope.heading);
		if ( this.fields.parent ) {
		    scope.heading.get_parent().children.delete(scope.heading);
		} else {
		    scope.children.delete(scope.heading);
		}
	    }
	}
	// Attach aloha editor
	Aloha.ready( function() {
	    Aloha.jQuery(element.find('.edit-text')).aloha();
	});
    }
    return {
	link: link
    };
});

/*************************************************
* Directive that shows a list of Scopes tabs
*
**************************************************/
gtd_module.directive('owScopeTabs', function() {
    // Directive creates the pieces that allow the user to edit a heading
    function link(scope, element, attrs) {
	// Set initial active scope tab
	element.find('[scope_id="'+scope.active_scope+'"]').addClass('active');
	scope.active_scope
	scope.change_scope = function(e) {
	    var new_scope;
	    // User has requested a different scope
	    element.find('[scope_id="'+scope.active_scope+'"]').removeClass('active');
	    scope.active_scope = parseInt($(e.currentTarget).attr('scope_id'), 10);
	    element.find('[scope_id="'+scope.active_scope+'"]').addClass('active');
	}
    }
    return {
	link: link
    }
});

/*************************************************
* Directive that lets a user change the todo state
* with a popover menu
**************************************************/
gtd_module.directive('owTodo', function($filter) {
    // Directive creates the pieces that allow the user to edit a heading
    function link(scope, element, attrs) {
	var i, $span, $popover, $options, state, content, s, style;
	style = $filter('style');
	scope.heading.todo_popover = false;
	if (scope.heading.todo_state) {
	    element.tooltip({
		delay: {show:1000, hide: 100},
		title: scope.heading.todo_state.fields.display_text,
		placement: 'right'
	    });
	}
	$span = element.children('span');
	function remove_popover($target) {
	    // Remove the popover
		$target.popover('destroy');
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
		    scope.heading.save({ auto: true });
		    remove_popover($target);
		    return false;
		});
	    });
	}
	$span.on('click', function(e) {
	    add_popover($span);
	});
    }
    return {
	link: link,
	templateUrl: 'todo-state-selector',
    };
});

/*************************************************
* Angular project ouline appliance controller
*
**************************************************/
gtd_module.controller('nodeOutline', function($scope, $http, $resource, OldHeading, Heading, $element, $location, $anchorScroll) {
    var TodoState, Scope, url, get_heading, Parent, Tree, parent_tree_id, parent_level, target_headings;
    // modified array to hold all the tasks
    test_headings = Heading.query({'parent_id': 0});
    $scope.headings = new HeadingManager($scope);
    $scope.children = new HeadingManager($scope);
    $scope.headings.add(test_headings);
    $scope.active_scope = 0;
    $scope.sort_field = 'title';
    $scope.sort_fields = [
	{key: 'title', display: 'Title'},
	{key: '-title', display: 'Title (reverse)'},
    ];
    // Get id of parent heading
    $scope.parent_id = $element.attr('parent_id');
    if ($scope.parent_id === '') {
	$scope.parent_id = 0;
    } else {
	$scope.parent_id = parseInt($scope.parent_id, 10);
    }
    $scope.show_arx = false;
    $scope.state = 'open';
    $scope.rank = 0;
    $scope.update = function() {
	$scope.children = $scope.headings.filter_by({parent: null});
    }
    // Get all TodoState's for later use
    TodoState = $resource('/gtd/todostate/');
    $scope.todo_states = TodoState.query();
    test_headings = $scope.todo_states;
    // If a parent node was passed
    if ( $scope.parent_id ) {
	parent_tree_id = parseInt($element.attr('parent_tree'), 10);
	parent_level = parseInt($element.attr('level'), 10);
	target_headings = Heading.query({'tree_id': parent_tree_id,
				       'level__lte': parent_level + 1});
	$scope.headings.add(target_headings);
	// Recurse through and open all the ancestors of the target heading
	target_headings.$promise.then(function() {
	    var target = $scope.headings.get({pk: $scope.parent_id});
	    var open = function(child) {
		child.toggle('open');
		child.update();
		var parent = child.get_parent()
		if ( parent.rank !== 0 ) {
		    open(parent);
		}
	    }
	    if ( target.fields.archived ) {
		$scope.show_arx = true;
	    }
	    open(target);
	    target.editable = true;
	});
    }
    // Get Scope objects
    Scope = $resource('/gtd/scope/');
    $scope.scopes = Scope.query();
    url = '/gtd/node/descendants/0/';
    // Helper function that returns the heading object for a given event
    get_heading = function(e) {
	var $heading, heading, node_id;
	$heading = $(e.delegateTarget).closest('.heading');
	node_id = Number($heading.attr('node_id'));
	heading = $scope.headings.get({pk: node_id});
	return heading;
    };
    // Handler for when a heading is clicked...
    $scope.toggle_node = function(e) {
	var $target, $heading, heading, new_heading;
	$target = $(e.target);
	heading = get_heading(e);
	// Handlers for clicking different parts of the heading
	if ( $target.hasClass('edit-btn') ) {
	    // Edit button
	    heading.populate_children();
	    heading.editable = true;
	} else if ( $target.hasClass('todo-state') ) {
	    // No-op for todo_state button
	    console.log('todo-state clicked');
	} else if ( $target.hasClass('archive-btn') ) {
	    // Archive heading button
	    if ( heading.fields.archived ) {
		heading.fields.archived = false;
	    } else {
		heading.fields.archived = true;
	    }
	    heading.save();
	} else if ( $target.hasClass('new-btn') ) {
	    // New heading button
	    new_heading = new OldHeading({pk: 0,
				       workspace: heading.workspace,
				       model: 'gtd.node',
				       fields: {
					   title: '',
					   parent: heading.pk,
					   level: heading.fields.level + 1,
				       }});
	    new_heading.editable = true;
	    heading.children.add(new_heading);
	    $scope.headings.add(new_heading);
	    heading.toggle('open');
	} else {
	    // Default action: opening the heading
	    heading.toggle();
	}
    };
    // Handler for toggling archived nodes
    $scope.show_all = function(e) {
	if ( $scope.show_arx === true ) {
	    $scope.show_arx = false;
	} else {
	    $scope.show_arx = true;
	}
    };
    // Handler for adding a new node
    $scope.add_heading = function(e) {
	var new_heading;
	new_heading = new OldHeading({pk: 0,
				   workspace: $scope,
				   model: 'gtd.node',
				   fields: {
				       title: 'marvelous',
				       parent: null,
				       level: 0,
				   }});
	new_heading.editable = true;
	$scope.headings.add(new_heading);
	$scope.children.add(new_heading);
    };
});
