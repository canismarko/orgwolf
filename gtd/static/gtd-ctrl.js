/*globals document, $, jQuery, document, Aloha, window, alert, GtdHeading, HeadingManager, angular*/
"use strict";

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
gtd_module.factory('Heading', function() {
    return function(data) {
	return new GtdHeading(data);
    };
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
	    color_i = (obj.rank - 1) % colors.length;
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
	// Attach aloha editor
	Aloha.ready( function() {
	    Aloha.jQuery(element.find('.edit-text')).aloha();
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
	scope.cancel = function(e) {
	    scope.heading.editable = false;
	};
	console.log(scope.heading);
    }
    return {
	link: link
    };
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
gtd_module.controller('nodeOutline', function($scope, $http, $resource, Heading, $element) {
    var TodoState, url, get_heading;
    // modified array to hold all the tasks
    $scope.headings = new HeadingManager($scope);
    $scope.children = new HeadingManager($scope);
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
    // Get all TodoState's for later use
    TodoState = $resource('/gtd/todostate/');
    $scope.todo_states = TodoState.query();
    // Children = $resource('/gtd/node/descendants/0/');
    url = '/gtd/node/descendants/' + $scope.parent_id + '/';
    $http({method: 'GET', url: url}).
	success(function(data, status, headers, config) {
	    var i;
	    for ( i=0; i<data.length; i+=1 ) {
		data[i].workspace = $scope;
	    }
	    $scope.headings.add(data);
	    $scope.rank1_headings = $scope.headings.filter_by({rank: 1});
	}).
	error( function(data, status, headers, config) {
	    console.error('fail!');
	});
    get_heading = function(e) {
	var $heading, heading, node_id;
	// Helper function that returns the heading object for a given event
	$heading = $(e.delegateTarget).closest('.heading');
	node_id = Number($heading.attr('node_id'));
	heading = $scope.headings.get({pk: node_id});
	return heading;
    };
    $scope.toggle_node = function(e) {
	// When a heading is clicked...
	var $target, $heading, heading, new_heading;
	$target = $(e.target);
	heading = get_heading(e);
	// Handlers for clicking different parts of the heading
	if ( $target.hasClass('edit-btn') ) {
	    // Edit button
	    heading.populate_children();
	    heading.editable = true;
	} else if ( $target.hasClass('todo-state') ) {
	    console.log('todo-state clicked');
	} else if ( $target.hasClass('archive-btn') ) {
	    if ( heading.fields.archived ) {
		heading.fields.archived = false;
	    } else {
		heading.fields.archived = true;
	    }
	    heading.save();
	} else if ( $target.hasClass('new-btn') ) {
	    new_heading = new Heading({workspace: heading.workspace,
				       fields: {
					   title: '',
					   parent: heading.pk
				       }});
	    new_heading.editable = true;
	    heading.children.add(new_heading);
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
    $scope.edit_cancel = function(e) {
	var heading;
	// If editing is cancelled
	heading = get_heading(e);
	heading.editable = false;
    };
});
