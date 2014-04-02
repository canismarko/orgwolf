/*globals document, $, jQuery, Aloha, window, alert, angular, ga*/
"use strict";
var test_headings, owConfig, HeadingFactory, outlineCtrl, listCtrl;

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
    var TodoState, Context, Scope, getState;
    // Get list of contexts for filtering against
    Context = $resource('/gtd/context/');
    $rootScope.contexts = Context.query();
    // Get list of scopes for tabs
    Scope = $resource('/gtd/scope/');
    $rootScope.scopes = Scope.query();
}]);

owMain.controller('owNotifications', ['$scope', 'notifyList', function($scope, notifyList) {
    $scope.notifyList = notifyList;
}]);

/*************************************************
* Handler sends google analytics tracking on
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
		     $scope.$apply( function() {
			 owWaitIndicator.end_wait('quickcapture');
		     });
		 },
		 success: function() {
		     $textbox.val('');
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
    ['$scope', '$rootScope', '$http', '$resource', '$filter', 'Heading',
     '$location', '$anchorScroll', 'owWaitIndicator',  outlineCtrl]
);
function outlineCtrl($scope, $rootScope, $http, $resource, $filter, Heading,
		     $location, $anchorScroll, owWaitIndicator) {
    var TodoState, Scope, url, get_heading, Parent, Tree, parent_tree_id, parent_level, target_headings, target_id, main_headings, newButton, showAllButton;
    $('.ow-active').removeClass('active');
    $('#nav-projects').addClass('active');
    newButton = $('#add-heading');
    showAllButton = $('#show-all');
    target_id = $location.hash().split('-')[0];
    if ( target_id ) {
	$scope.target_heading = Heading.get({id: target_id});
    }
    // modified array to hold all the tasks
    $scope.children = Heading.query({'parent_id': 0,
				     'archived': false,
				     'field_group': 'outline'});
    $scope.activeScope = null;
    $scope.sortField = 'title';
    $scope.sortFields = [
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
    $rootScope.showArchived = false;
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
		$rootScope.showArchived = true;
	    }
	    open(target);
	    target.editable = true;
	});
    }
    // Handler for toggling archived nodes
    $scope.showAll = function(e) {
	var arx_headings;
	$rootScope.showArchived = !$rootScope.showArchived;
	showAllButton.toggleClass('active');
	// Fetch archived nodes if not cached
	if ( ! $scope.arx_cached ) {
	    arx_headings = Heading.query({'parent_id': 0,
					   'archived': true});
	    arx_headings.$promise.then(function() {
		$scope.children = $scope.children.concat(arx_headings);
	    });
	    $scope.arx_cached = true;
	}
	// Broadcast to all child nodes that archived nodes should be shown
	$scope.$broadcast('toggle-archived', $rootScope.showArchived);
    };
    // Handler for adding a new project
    $scope.addProject = function(e) {
	var $off;
	$scope.newProject = !$scope.newProject;
	newButton.toggleClass('active');
	$off = $scope.$on('finishEdit', function(e, newHeading) {
	    e.stopPropagation();
	    $scope.newProject = false;
	    newButton.removeClass('active');
	    if ( newHeading ) {
		// Re-sort list then add new heading
		$scope.sortFields.unshift({key: 'none', display: 'None'});
		$scope.children = $filter('order')($scope.children, $scope.sortField);
		$scope.sortField = 'none';
		$scope.children.unshift(newHeading);
	    }
	    $off();
	});
    };
    // Handler for changing the scope
    $scope.$on('scope-changed', function(e, newScope) {
	$scope.activeScope = newScope;
    });
}

/*************************************************
* Angular actions list controller
*
**************************************************/
owMain.controller(
    'nextActionsList',
    ['$sce', '$scope', '$resource', '$location', '$routeParams', '$filter',
     'Heading', 'todoStates', listCtrl]
);
function listCtrl($sce, $scope, $resource, $location, $routeParams, $filter, Heading, todoStates) {
    var i, TodoState, Context, today, update_url, get_list, parent_id, todo_states;
    $('.ow-active').removeClass('active');
    $('#nav-actions').addClass('active');
    $scope.list_params = {};
    $scope.showArchived = true;
    $scope.activeScope = null;
    // Context filtering
    if (typeof $routeParams.context_id !== 'undefined') {
	$scope.activeContext = parseInt($routeParams.context_id, 10);
	$scope.contextName = $routeParams.context_slug;
	$scope.list_params.context = $scope.activeContext;
    } else {
	$scope.activeContext = null;
    }
    $scope.show_list = true;
    // See if there's a parent specified
    parent_id = $location.search().parent;
    if ( parent_id ) {
	parent_id = parseInt(parent_id, 10);
	$scope.parent_id = parent_id;
	$scope.list_params.parent = parent_id;
	$scope.parent = $resource('/gtd/node/:id/')
	    .get({id: parent_id});
    }
    // Set todoStates
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
    $scope.cachedStates = todo_states.slice(0);
    $scope.activeStates = todo_states.slice(0);
    $scope.list_params.todo_state = $scope.activeStates;
    $scope.currentDate = new Date();
    $scope.$watch('currentDate', function() {
	$scope.$emit('refresh_list');
    }, true);
    $scope.todoStates = todoStates;
    // Helper function finds which upcoming and action headings to display
    $scope.setVisibleHeadings = function() {
	var currentListFilter = $filter('currentList');
	$scope.visibleHeadings = $scope.upcomingList.slice(0);
	$scope.visibleHeadings = $scope.visibleHeadings.concat(
	    currentListFilter($scope.actionsList, $scope.activeStates, $scope.upcomingList)
	);
    };
    $scope.$watchCollection('actionsList', function() {
	$scope.setVisibleHeadings();
    });
    $scope.$watchCollection('upcomingList', function() {
	$scope.setVisibleHeadings();
    });
    // Receiver that retrieves GTD lists from server
    $scope.$on('refresh_list', function() {
	var upcomingParams;
	$scope.actionsList = Heading.query($scope.list_params);
	upcomingParams = angular.extend(
	    {upcoming: $scope.currentDate.ow_date()},
	    $scope.list_params);
	$scope.upcomingList = Heading.query(upcomingParams);
	$scope.scheduledList = Heading.query(
	    {
		field_group: 'actions_list',
		scheduled_date__lte: $scope.currentDate.ow_date(),
		todo_state: 8
	    }
	);
    });
    // Receiver for when the active scope changes (by clicking a tab)
    $scope.$on('scope-changed', function(e, newScope) {
	$scope.activeScope = newScope;
    });
    // Todo state filtering
    $scope.toggleTodoState = function(targetState) {
	// Add or remove a TodoState from the active list
	var i = $scope.activeStates.indexOf(targetState.id);
	if ( i > -1 ) {
	    $scope.activeStates.splice(i, 1);
	} else {
	    $scope.activeStates.push(targetState.id);
	}
	$scope.setVisibleHeadings();
    };
    $scope.$watchCollection('activeStates', function(newList, oldList) {
	var new_states, list_params;
	list_params = {};
	list_params.todo_state = newList.filter(function(state) {
	    return $scope.cachedStates.indexOf(state) === -1;
	});
	if( list_params.todo_state.length > 0 ) {
	    new_states = Heading.query(list_params);
	    new_states.$promise.then(function() {
		$scope.cachedStates = $scope.cachedStates.concat(
		    list_params.todo_state);
		$scope.actionsList = $scope.actionsList.concat(new_states);
	    });
	}
    });
    // Helper function for setting the browser URL for routing
    update_url = function(params) {
	var path, search;
	path = '/gtd/actions';
	if (params.activeContext) {
	    /*jslint regexp: true */
	    path += '/' + params.activeContext;
	    path += '/' + params.contextName
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
	search.todo_state = $scope.activeStates;
	$location.search(search);
    };
    // Handler for changing the context
    $scope.changeContext = function(e) {
	var $navButton, $navText, $navLink, newContext;
	// Get new list of headings for this context
	$scope.list_params.context = $scope.activeContext || 0;
	if ($scope.activeContext) {
	    $scope.contextName = $scope.contexts.filter(function(context) {
		return context.id === $scope.activeContext;
	    })[0].name;
	} else {
	    delete $scope.contextName;
	}
	$scope.list_params.todo_state = $scope.activeStates;
	$scope.$emit('refresh_list');
	update_url($scope);
	// Update navbar button
	$navButton = $('#nav-actions');
	$navText = $navButton.find('.nav-text');
	$navLink = $navButton.find('a');
	newContext = $scope.contexts.filter(function(context) {
	    return context.id === $scope.activeContext;
	});
	if (newContext.length === 1) {
	    $navText.text(newContext[0].name + ' Actions');
	} else {
	    $navText.text('Next Actions');
	}
	$navLink.attr('href', $location.absUrl());
	console.log($location.absUrl());
    };
    // Handler for only showing one parent
    $scope.filter_parent = function(h) {
	if ( h === null ) {
	    delete $scope.parent_id;
	} else {
	    $scope.parent_id = h.root_id;
	}
	update_url($scope);
    };
}
