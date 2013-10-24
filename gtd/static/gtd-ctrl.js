/*************************************************
* Angular module for all GTD components
*
/*************************************************/
var gtd_module = angular.module('orgWolf', ['ngAnimate', 'ngResource']);

/*************************************************
* Filter that determines TodoState color
*
/*************************************************/
gtd_module.filter('style', function() {
    return function(obj) {
	var style, c;
	style = '';
	if ( obj.model === 'gtd.todostate' ) {
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
    return function(scope, element, attrs) {
	var $title = element.find('.edit-title');
	var $text = element.find('.edit-text');
	Aloha.ready( function () {
	    Aloha.jQuery($title).aloha();
	    Aloha.jQuery($text).aloha();
	});
	// Scroll so element is in view
	$('body').animate({scrollTop: element.offset().top-14}, '500');
    };
});

/*************************************************
* Angular project ouline appliance controller
*
/*************************************************/
gtd_module.controller('nodeOutline', ['$scope', '$http', '$resource', function($scope, $http, $resource) {
    var TodoState
    // modified array to hold all the tasks
    $scope.headings = new HeadingManager($scope);
    $scope.children = new HeadingManager($scope);
    $scope.show_arx = false;
    $scope.state = 'open';
    $scope.rank = 0;
    // Example of adding HTTP headers for django Request.is_ajax()
    var Node = $resource('/gtd/node/1/', {}, {
    	get: {
    	    method: "GET",
    	    headers: {
    		'X-Requested-With': 'XMLHttpRequest'
    	    }
    	}
    });
    // console.log(Node.get());
    // Get all TodoState's for later use
    TodoState = $resource('/gtd/todostate/')
    $scope.todo_states = TodoState.query({isArray: true});
    Children = $resource('/gtd/node/descendants/0/')
    // $scope.headings.add(Children.query());
    $http({method: 'GET', url: '/gtd/node/descendants/0/'}).
    	success(function(data, status, headers, config) {
    	    for ( var i=0; i<data.length; i++ ) {
    		data[i].fields.workspace = $scope;
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
	    $scope.edit_title = heading.title;
	} else if ( $target.hasClass('archive-btn') ) {
	    if ( heading.archived ) {
		heading.archived = false;
	    } else {
		heading.archived = true;
	    }
	    heading.save();
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
    $scope.edit_save = function(e) {
	// If edited nodes is saved
	var heading, data, $fields, $editable;
	data = {};
	data.fields = {};
	$heading = $(e.delegateTarget).closest('.heading');
	node_id = Number($heading.attr('node_id'))
	$editable = $(e.target).closest('.editable');
	// Sort through the fields and process
	$fields = $editable.find('[field]');
	data.pk = node_id;
	data.model = 'gtd.node';
	$fields.each( function(i) {
	    var $this = $(this);
	    data.fields[$this.attr('field')] = $this.val();
	});
	// Create new model from fields
	heading = new GtdHeading(data);
    }
}]);
