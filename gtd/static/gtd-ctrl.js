/*************************************************
* Angular module for all GTD components
*
/*************************************************/
var gtd_module = angular.module('orgWolf', ['ngAnimate', 'ngResource']);
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
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
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
/*************************************************/
gtd_module.factory('Heading', function() {
    return function(data) {
	return new GtdHeading(data);
    }
});

/*************************************************
* Filter that determines TodoState color
*
/*************************************************/
gtd_module.filter('style', function() {
    return function(obj) {
	var style, c;
	style = '';
	if (obj === null || obj === undefined) {
	    style = null;
	} else if ( obj.model === 'gtd.todostate' ) {
	    // First decode color into rgb
	    c = {}
	    c.RED_OFFSET = 16 // in bits
	    c.GREEN_OFFSET = 8
	    c.BLUE_OFFSET = 0
	    c.RED_MASK = 0xFF0000
	    c.GREEN_MASK = 0x00FF00
	    c.BLUE_MASK = 0x0000FF
	    c.red = (obj.fields._color_rgb & c.RED_MASK) >> c.RED_OFFSET
	    c.green = (obj.fields._color_rgb & c.GREEN_MASK) >> c.GREEN_OFFSET
	    c.blue = (obj.fields._color_rgb & c.BLUE_MASK) >> c.BLUE_OFFSET
	    style += 'color: rgba(' + c.red + ', ' + c.green + ', ' + c.blue;
	    style += ', ' + obj.fields._color_alpha + ')';
	}
	return style;
    };
});

/*************************************************
* Directive that lets a user edit a node
*
/*************************************************/
gtd_module.directive('owEditable', function() {
    // Directive creates the pieces that allow the user to edit a heading
    function link(scope, element, attrs) {
	var $text, heading;
	scope.fields = jQuery.extend(true, {}, scope.heading.fields);
	scope.priorities = ['A', 'B', 'C'];
	scope.time_units = [
	    {value: 'd', label: 'Days'},
	    {value: 'w', label: 'Weeks'},
	    {value: 'm', label: 'Months'},
	    {value: 'y', label: 'Years'},
	];
	$text = element.find('.edit-text');
	$save = element.find('#edit-save');
	// Scroll so element is in view
	$('body').animate({scrollTop: element.offset().top - 27}, '500');
	// Event handlers for the editable dialog
	scope.save = function(e) {
	    // Tasks for when the user saves the edited heading
	    scope.heading.fields = scope.fields;
	    scope.heading.update();
	    scope.heading.editable = false;
	    scope.heading.save();
	};
    }
    return {
	link: link
    }
});

/*************************************************
* Directive that lets a user edit a node
*
/*************************************************/
gtd_module.directive('owTodo', function() {
    // Directive creates the pieces that allow the user to edit a heading
    function link(scope, element, attrs) {
	var $span, $popover;
	if (scope.heading.todo_state) {
	    element.tooltip({
		delay: {show:1000, hide: 100},
		title: scope.heading.todo_state.fields.display_text,
		placement: 'right'
	    });
	}
	$span = element.children('span');
	$popover = element.children('.popover');
	$span.on('click', function(e) {
	    alert('todostate not yet implemented');
	    // $popover.show();
	});
    }
    return {
	link: link,
	templateUrl: 'todo-state-selector',
    }
});

/*************************************************
* Angular project ouline appliance controller
*
/*************************************************/
gtd_module.controller('nodeOutline', function($scope, $http, $resource, Heading, $element) {
    var TodoState, url;
    // modified array to hold all the tasks
    $scope.headings = new HeadingManager($scope);
    $scope.children = new HeadingManager($scope);
    // Get id of parent heading
    $scope.parent_id = $element.attr('parent_id');
    if ($scope.parent_id === '') {
	$scope.parent_id = 0;
    } else {
	$scope.parent_id = parseInt($scope.parent_id);
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
    	    for ( var i=0; i<data.length; i++ ) {
    		data[i].workspace = $scope;
    	    }
    	    $scope.headings.add(data);
    	    $scope.rank1_headings = $scope.headings.filter_by({rank: 1});
    	}).
    	error( function(data, status, headers, config) {
    	    console.error('fail!');
    	});
    get_heading = function(e) {
	var $heading, heading;
	// Helper function that returns the heading object for a given event
	$heading = $(e.delegateTarget).closest('.heading');
	node_id = Number($heading.attr('node_id'))
	heading = $scope.headings.get({pk: node_id});
	return heading;
    }
    $scope.toggle_node = function(e) {
	// When a heading is clicked...
	var $target, $heading, heading;
	$target = $(e.target);
	heading = get_heading(e);
	// Handlers for clicking different parts of the heading
	if ( $target.hasClass('edit-btn') ) {
	    // Edit button
	    heading.populate_children();
	    heading.state = 'open';
	    heading.editable = true;
	} else if ( $target.hasClass('todo-state') ) {

	} else if ( $target.hasClass('archive-btn') ) {
	    if ( heading.fields.archived ) {
		heading.fields.archived = false;
	    } else {
		heading.fields.archived = true;
	    }
	    heading.save();
	} else if ( $target.hasClass('new-btn') ) {
	    new_heading = Heading({workspace: heading.workspace,
				   fields: {
				       title: 'New Heading',
				       parent: heading.pk
				   }});
	    new_heading.editable = true;
	    new_heading.save();
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
