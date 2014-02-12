/*globals document, $, jQuery, Aloha, window, alert, GtdHeading, HeadingManager, angular, ga*/
"use strict";
var test_headings, owConfig, HeadingFactory, GtdListFactory, UpcomingFactory, outlineCtrl, listCtrl;

/*************************************************
* Angular module for all GTD components
*
**************************************************/
var owMain = angular.module(
    'owMain',
    ['ngAnimate', 'ngResource', 'ngSanitize', 'ngRoute',
     'owServices', 'owDirectives', 'owFilters']
);

/*************************************************
* Angular routing
*
**************************************************/
owMain.config(
    ['$routeProvider', '$locationProvider',
     function($routeProvider, $locationProvider) {
	 $locationProvider.html5Mode(true);
	 $routeProvider.
	     when('/gtd/actions/:context_id?/:context_slug?', {
		 templateUrl: '/static/actions-list.html',
		 controller: 'nextActionsList',
	     }).
	     when('/gtd/project/', {
		 templateUrl: '/static/project-outline.html',
		 controller: 'nodeOutline'
	     }).
	     when('/', {
		 redirectTo: '/gtd/project/'
	     });
}]);

owMain.config(['$httpProvider', '$locationProvider', owConfig]);
function owConfig($httpProvider, $locationProvider) {
    // Add custom headers to $http objects
    $httpProvider.defaults.headers.common['X-Request-With'] = 'XMLHttpRequest';
    // Add django CSRF token to all $http objects
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
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
}

/*************************************************
* Run setup gets some app-wide data
*
**************************************************/
owMain.run(['$rootScope', '$resource', function($rootScope, $resource) {
    // Get todo states
    var TodoState, Context, Scope;
    TodoState = $resource('/gtd/todostate/');
    $rootScope.todo_states = TodoState.query();
    // Get list of contexts for filtering against
    Context = $resource('/gtd/context/');
    $rootScope.contexts = Context.query();
    // Get list of scopes for tabs
    Scope = $resource('/gtd/scope/');
    $rootScope.scopes = Scope.query();
}]);

/*************************************************
* Setup notification box for action results
*
**************************************************/
owMain.run(['$rootScope', function($rootScope) {
    var NOTIFY_TIMEOUT, key;
    NOTIFY_TIMEOUT = 4000;
    $rootScope.notifications = [];
    $rootScope.notify = function(msg, cls) {
	console.log(msg);
	key = key + 1;
	$rootScope.notifications.push({pk: key,
					msg: msg,
					cls: cls});
	/* Clear the message after NOTIFY_TIMEOUT */
	setTimeout(function() {
	    $rootScope.$apply(function() {
		$rootScope.notifications.splice(0, 1);
	    });
	}, NOTIFY_TIMEOUT);
    };
}]);

/*************************************************
* Handler sends goole analytics tracking on
* angular route change
**************************************************/
owMain.run(['$rootScope', '$location', function($rootScope, $location) {
    $rootScope.$on('$routeChangeSuccess', function() {
	// Only active if django DEBUG == True
	if ( typeof ga !== 'undefined' ) {
	    ga('send', 'pageview', {'page': $location.path()});
	}
    });
}]);

/*************************************************
* Angular controller for capturing quick thoughts
* to the inbox
**************************************************/
owMain.controller(
    'inboxCapture',
    ['$scope', '$rootScope', 'owWaitIndicator',
    function ($scope, $rootScope, owWaitIndicator) {
	$scope.capture = function(e) {
	    // Send a captured inbox item to the server for processing
	    var text, data, $textbox;
	    data = {handler_path: 'plugins.quickcapture'};
	    $textbox = $(e.target).find('#new_inbox_item');
	    data.subject = $textbox.val();
	    owWaitIndicator.start_wait('medium', 'quickcapture');
	    $.ajax(
		'/wolfmail/message/',
		{type: 'POST',
		 data: data,
		 complete: function() {
		     owWaitIndicator.end_wait('quickcapture');
		 },
		 success: function() {
		     $textbox.val('');
		     owWaitIndicator.start_wait('medium', 'get-messages');
		     $rootScope.$emit('refresh_messages');
		 },
		 error: function(jqXHR, status, error) {
		     alert('Failed!');
		     console.log(status);
		     console.log(error);
		 }
		}
	    );
	};
    }]
);

/*************************************************
* Angular project ouline appliance controller
*
**************************************************/
owMain.controller(
    'nodeOutline',
    ['$scope', '$http', '$resource', 'OldHeading', 'Heading',
     '$location', '$anchorScroll', 'owWaitIndicator',  outlineCtrl]
);
function outlineCtrl($scope, $http, $resource, OldHeading, Heading,
		     $location, $anchorScroll, owWaitIndicator) {
    var TodoState, Scope, url, get_heading, Parent, Tree, parent_tree_id, parent_level, target_headings, target_id, main_headings;
    $('.ow-active').removeClass('active');
    $('#nav-projects').addClass('active');
    target_id = $location.hash().split('-')[0];
    if ( target_id ) {
	$scope.target_heading = $resource('/gtd/node/:id/').get({id: target_id});
    }
    // modified array to hold all the tasks
    main_headings = Heading.query({'parent_id': 0,
				   'archived': false});
    $scope.headings = new HeadingManager($scope);
    $scope.children = new HeadingManager($scope);
    $scope.headings.add(main_headings);
    $scope.active_scope = 0;
    $scope.sort_field = 'title';
    $scope.sort_fields = [
	{key: 'title', display: 'Title'},
	{key: '-title', display: 'Title (reverse)'},
	{key: '-opened', display: 'Creation date'},
	{key: 'opened', display: 'Creation date (oldest first)'},
    ];
    // Get id of parent heading
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
    };
    // If a parent node was passed
    if ( $scope.parent_id ) {
	target_headings = Heading.query({'tree_id': parent_tree_id,
					 'level__lte': parent_level + 1});
	$scope.headings.add(target_headings);
	// Recurse through and open all the ancestors of the target heading
	target_headings.$promise.then(function() {
	    var target, open;
	    target = $scope.headings.get({pk: $scope.parent_id});
	    open = function(child) {
		var parent;
		child.toggle('open');
		child.update();
		parent = child.get_parent();
		if ( parent.rank !== 0 ) {
		    open(parent);
		}
	    };
	    if ( target.fields.archived ) {
		$scope.show_arx = true;
	    }
	    open(target);
	    target.editable = true;
	});
    }
    // Helper function that returns the heading object for a given event
    get_heading = function(e) {
	var $heading, heading, node_id;
	$heading = $(e.delegateTarget).closest('.heading');
	node_id = Number($heading.attr('node_id'));
	heading = $scope.headings.get({pk: node_id});
	return heading;
    };
    // Handlers for when a heading is clicked...
    $scope.edit_heading = function(heading) {
	// Edit button
	heading.populate_children();
	heading.editable = true;
    };
    $scope.archive_heading = function(heading) {
	// Archive heading button
	if ( heading.fields.archived ) {
	    heading.fields.archived = false;
	} else {
	    heading.fields.archived = true;
	}
	heading.save();
    };
    $scope.new_heading = function(heading) {
	// New heading button
	var new_heading;
	new_heading = new OldHeading(
	    {
		id: 0,
		workspace: heading.workspace,
		title: '',
		parent: heading.pk,
		level: heading.fields.level + 1,
		scope: heading.fields.scope,
	    });
	new_heading.editable = true;
	new_heading.expandable = 'no';
	heading.children.add(new_heading);
	$scope.headings.add(new_heading);
	heading.toggle('open');
    };
    $scope.toggle_node = function(heading) {
	// Default action: opening the heading
	heading.toggle();
    };
    // Handler for toggling archived nodes
    $scope.show_all = function(e) {
	var arx_headings;
	if ( $scope.show_arx === true ) {
	    $scope.show_arx = false;
	} else {
	    $scope.show_arx = true;
	}
	// Fetch archived nodes if not cached
	if ( ! $scope.arx_cached ) {
	    arx_headings = Heading.query({'parent_id': 0,
					   'archived': true});
	    $scope.headings.add(arx_headings);
	    $scope.headings.add(arx_headings);
	    $scope.arx_cached = true;
	}
    };
    // Handler for adding a new node
    $scope.add_heading = function(e) {
	var new_heading;
	new_heading = new OldHeading(
	    {
		id: 0,
		workspace: $scope,
		title: '',
		parent: null,
		level: 0,
	    });
	new_heading.editable = true;
	$scope.headings.add(new_heading);
	$scope.children.add(new_heading);
    };
}

/*************************************************
* Angular actions list controller
*
**************************************************/
owMain.controller(
    'nextActionsList',
    ['$sce', '$scope', '$resource', '$location', '$routeParams',
     'GtdList', 'Heading', 'Upcoming', listCtrl]
);
function listCtrl($sce, $scope, $resource, $location, $routeParams,
		  GtdList, Heading, Upcoming) {
    var i, TodoState, Context, today, update_url, get_list, parent_id, todo_states;
    $('.ow-active').removeClass('active');
    $('#nav-actions').addClass('active');
    $scope.list_params = {};
    // Context filtering
    if (typeof $routeParams.context_id !== 'undefined') {
	$scope.active_context = parseInt($routeParams.context_id, 10);
	$scope.context_name = $routeParams.context_slug;
	$scope.list_params.context = $scope.active_context;
    } else {
	$scope.active_context = null;
    }
    $scope.show_list = true;
    // No-op to prevent function-not-found error
    $scope.update = function() {};
    // See if there's a parent specified
    parent_id = $location.search().parent;
    if ( parent_id ) {
	parent_id = parseInt(parent_id, 10);
	$scope.parent_id = parent_id;
	$scope.list_params.parent = parent_id;
	$scope.parent = $resource('/gtd/node/:id/')
	    .get({id: parent_id});
    }
    // Set todo_states
    todo_states = $location.search().todo_state;
    if ( todo_states ) {
	// Pull from URL if provided
	if ( !Array.isArray(todo_states) ) {
	    todo_states = [todo_states];
	}
	// Convert strings to int
	todo_states = todo_states.map(function(v) {
	    return parseInt(v, 10);
	});
    } else {
	todo_states = [2];
    }
    $scope.cached_states = todo_states.slice(0);
    $scope.active_states = todo_states.slice(0);
    $scope.currentDate = new Date();
    $scope.$watch('currentDate', function() {
	$scope.$emit('refresh_list');
    }, true);
    $scope.list_params.todo_state = $scope.active_states;
    // Receiver that retrieves new GTD list from server
    $scope.$on('refresh_list', function() {
	$scope.headings = new HeadingManager($scope);
	$scope.headings.add(GtdList.query($scope.list_params));
	$scope.headings.add(Upcoming.query());
	// Get list of hard scheduled commitments
	$scope.scheduled = new HeadingManager($scope);
	$scope.scheduled.add(Heading.query(
	    {
		field_group: 'actions_list',
		scheduled_date__lte: $scope.currentDate.ow_date(),
		todo_state: 8
	    }
	));
    });
    $scope.show_arx = true;
    $scope.active_scope = 0;
    // Todo state filtering
    $scope.toggle_todo_state = function(e) {
	var i, state_pk, state, state_url;
	state_pk = parseInt($(e.target).attr('ow-state'), 10);
	// Hide the current elements
	i = $scope.active_states.indexOf(state_pk);
	if ( i > -1 ) {
	    $scope.active_states.splice(i, 1);
	} else {
	    $scope.active_states.push(state_pk);
	}
	// Fetch the node list if it's not already retrieved
	if ( $scope.cached_states.indexOf(state_pk) === -1 ) {
	    $scope.cached_states.push(state_pk);
	    $scope.list_params.todo_state = state_pk;
	    $scope.headings.add(GtdList.query($scope.list_params));
	}
    };
    // Helper function for setting the browser URL for routing
    update_url = function(params) {
	var path, search;
	path = '/gtd/actions';
	if (params.active_context) {
	    /*jslint regexp: true */
	    path += '/' + params.active_context;
	    path += '/' + params.context_name
		.toLowerCase()
		.replace(/ /g,'-')
		.replace(/[^\w\-]+/g,'');
	    /*jslint regexp: false */
	}
	$location.path(path);
	search = {};
	if ($scope.parent_id) {
	    search.parent = $scope.parent_id;
	}
	search.todo_state = $scope.active_states;
	$location.search(search);
    };
    // Handler for changing the context
    $scope.change_context = function(e) {
	// Get new list of headings for this context
	$scope.headings = new HeadingManager($scope);
	$scope.list_params.context = $scope.active_context;
	if ($scope.active_context) {
	    $scope.context_name = $scope.contexts.get(
		{id: $scope.active_context}
	    ).name;
	} else {
	    delete $scope.context_name;
	}
	$scope.list_params.todo_state = $scope.active_states;
	$scope.headings.add(GtdList.query($scope.list_params));
	update_url($scope);
    };
    // Handler for only showing one parent
    $scope.filter_parent = function(h) {
	if ( h === null ) {
	    delete $scope.parent_id;
	} else {
	    $scope.parent_id = h.fields.root_id;
	}
	update_url($scope);
    };
}
