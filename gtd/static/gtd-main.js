/*globals document, $, jQuery, Aloha, window, alert, angular, ga*/
"use strict";
var test_headings, owConfig, HeadingFactory, outlineCtrl, listCtrl;

/*************************************************
* Angular module for all GTD components
*
**************************************************/
var owMain = angular.module(
    'owMain',
    ['ngAnimate', 'ngResource', 'ngSanitize', 'ngRoute', 'ngCookies',
     'ui.bootstrap', 'ui.calendar', 'toaster',
     'owServices', 'owDirectives', 'owFilters']
)

/*************************************************
* Angular routing
*
**************************************************/
.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $locationProvider.html5Mode(true);
    $routeProvider
	.when('/gtd/actions/:context_id?/:context_slug?', {
	    templateUrl: '/static/actions-list.html',
	    controller: 'nextActionsList',
	    reloadOnSearch: false,
	})
	.when('/gtd/projects/', {
	    templateUrl: '/static/project-outline.html',
	    controller: 'nodeOutline'
	})
	.when('/search/', {
	    templateUrl: '/static/search-results.html',
	    controller: 'search'
	})
	.when('/calendar/', {
	    templateUrl: '/static/calendar.html',
	    controller: 'calendar'
	})
	.when('/', {
	    redirectTo: '/gtd/projects/'
	});
}])

.config(['$httpProvider', '$locationProvider', function ($httpProvider, $locationProvider) {
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
}])

/*************************************************
* Run setup gets some app-wide data
*
**************************************************/
.run(['$rootScope', '$resource', function($rootScope, $resource) {
    var TodoState, Context, FocusArea, getState;
    // Get list of contexts for filtering against
    Context = $resource('/gtd/contexts/');
    $rootScope.contexts = Context.query();
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
     '$location', '$anchorScroll', 'owWaitIndicator', 'activeHeading', outlineCtrl]
);
function outlineCtrl($scope, $rootScope, $http, $resource, $filter, Heading,
		     $location, $anchorScroll, owWaitIndicator, activeHeading) {
    var TodoState, Scope, url, get_heading, Parent, Tree, parent_tree_id, parent_level, target_headings, targetId, main_headings, newButton, showAllButton;
    newButton = $('#add-heading');
    showAllButton = $('#show-all');
    // Check if the user is requesting a specific node in the URL
    activeHeading.activate($location.hash().split('-')[0]);
    $scope.activeHeading = activeHeading;
    // Get all the top-level projects
    function getHeadings() {
	$scope.children = Heading.query({'parent_id': 0,
					 'archived': false,
					 'field_group': 'outline'});
    }
    getHeadings();
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
    // Respond to refresh-data signals (logging in, etc)
    $scope.$on('refresh-data', getHeadings);
    // Handler for changing the focus area
    $scope.$on('focus-area-changed', function(e, newFocusArea) {
	$scope.activeFocusArea = newFocusArea;
    });
}

/*************************************************
* Angular actions list controller
*
**************************************************/
owMain.controller(
    'nextActionsList',
    ['$sce', '$scope', '$resource', '$location', '$routeParams', '$filter',
     'Heading', 'todoStates', 'owWaitIndicator', '$cookies', listCtrl]
);
function listCtrl($sce, $scope, $resource, $location, $routeParams, $filter, Heading, todoStates, owWaitIndicator, $cookies) {
    var i, TodoState, Context, today, update_url, get_list, parent_id, todo_states;
    $scope.list_params = {field_group: 'actions_list'};
    $scope.showArchived = true;
    $scope.todoStates = todoStates;
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
    // Get data from url query parameters
    function getDataFromUrl() {
	$scope.parentId = $location.search().parent;
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
    }
    getDataFromUrl();
    // Filtering by a parent Node
    $scope.$on('$routeUpdate', getDataFromUrl);
    $scope.$on('filter-parent', function(callingScope, newParentId) {
	$scope.parentId = newParentId;
	update_url($scope);
    });
    $scope.$watch('parentId', function(newParentId) {
	// Retrieve the full parent object
	if (newParentId) {
	    $scope.activeParent = Heading.get({id: newParentId});
	    $scope.activeParent.$promise.then($scope.setVisibleHeadings);
	} else {
	    $scope.activeParent = null;
	    $scope.setVisibleHeadings();
	}
    });
    // Set todoStates
    $scope.currentDate = new Date();
    $scope.$watch('currentDate', function() {
	$scope.$emit('refresh_list');
    }, true);
    // Helper function finds which upcoming and action headings to display
    $scope.setVisibleHeadings = function() {
	var currentListFilter = $filter('currentList');
	$scope.visibleHeadings = [];
	if ( $scope.upcomingList ) {
	    $scope.visibleHeadings = $scope.visibleHeadings.concat(
		$scope.upcomingList);
	    $scope.visibleHeadings = $scope.visibleHeadings.concat(
		currentListFilter($scope.actionsList,
				  $scope.activeStates,
				  $scope.upcomingList,
				  $scope.activeParent)
	    );
	}
    };
    $scope.$watchCollection('actionsList', function() {
	$scope.setVisibleHeadings();
    });
    $scope.$watchCollection('upcomingList', function() {
	$scope.setVisibleHeadings();
    });
    // Receiver that retrieves GTD lists from server
    $scope.refreshList = function() {
	var upcomingParams, $unwatch;
	// Variables for tracking status
	$scope.isLoading = true;
	owWaitIndicator.start_wait('quick', 'loadLists');
	$scope.completedRequests = [];
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
	// Check for all lists to be retrieved
	$unwatch = $scope.$watch(
	    function() {
		return ($scope.actionsList.$resolved &&
			$scope.upcomingList.$resolved &&
			$scope.scheduledList.$resolved);
	    },
	    function (loadingIsComplete) {
		$scope.isLoading = !loadingIsComplete;
		if (loadingIsComplete) {
		    owWaitIndicator.end_wait('quick', 'loadLists');
		    $unwatch();
		}
	    });
    };
    $scope.$on('refresh_list', $scope.refreshList);
    $scope.$on('refresh-data', $scope.refreshList);
    // Receiver for when the active focus area changes (by clicking a tab)
    $scope.$on('focus-area-changed', function(e, newFocusArea) {
	$scope.activeFocusArea = newFocusArea;
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
	update_url($scope);
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
	$scope.setVisibleHeadings();
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
	if ($scope.parentId) {
	    search.parent = $scope.parentId;
	}
	search.todo_state = $scope.activeStates;
	$location.search(search);
    };
    // Handler for changing the context
    $scope.changeContext = function() {
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
	$cookies.activeContext = String($scope.activeContext);
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
    };
}

/*************************************************
* Search controller
*
**************************************************/
owMain.controller('search', ['$scope', '$location', 'Heading', function($scope, $location, Heading) {
    var i, query, resultIds, result, reString, addToResults;
    $scope.rawResults = [];
    // Process search string into seperate queries
    $scope.queryString = $location.search().q.replace("+", " ");
    $scope.queries = $scope.queryString.split(" ");
    addToResults = function(r) {
	$scope.rawResults = $scope.results.concat(r);
    };
    for (i=0; i<$scope.queries.length; i+=1) {
	query = $scope.queries[i];
	// Fetch query results and combine into one array
	Heading.query({'title__contains': query}).$promise.then(addToResults);
	Heading.query({'text__contains': query}).$promise.then(addToResults);
    }
    // Deduplicate results
    $scope.$watchCollection('rawResults', function() {
	resultIds = [];
	$scope.results = [];
	for (i=0; i<$scope.rawResults.length; i+=1) {
	    result = $scope.rawResults[i];
	    if (resultIds.indexOf(result.id) === -1) {
		// First instance of this result so save it
		$scope.results.push(result);
		resultIds.push(result.id);
	    }
	}
    });
    // Prepare a regular expression of query string for highlighting text
    reString = '';
    for (i=0; i<$scope.queries.length; i+=1) {
	reString += "|" + $scope.queries[i];
    }
    if ($scope.queries.length > 0) {
	// Remove leading | character
	reString = reString.slice(1);
    }
    $scope.reString = reString;
}])

/*************************************************
* Calendar controller
*
**************************************************/
.controller('calendar', ['$scope', 'Heading', '$filter', '$modal', function($scope, Heading, $filter, $modal) {
    // Uses angular-ui-calendar from https://github.com/angular-ui/ui-calendar
    var date, d, m, y;
    // List of calendars that are actually shown
    $scope.activeCalendars = [];
    date = new Date();
    d = date.getDate();
    m = date.getMonth();
    y = date.getFullYear();
    // Method for adding/removing calendars from the list
    $scope.toggleCalendar = function(cal) {
	var idx;
	idx = $scope.activeCalendars.indexOf(cal.calId);
	if (idx > -1) {
	    // Remove calendar
	    $scope.activeCalendars.splice(idx, 1);
	} else {
	    // Add calendar
	    $scope.activeCalendars.push(cal.calId);
	}
	$scope.owCalendar.fullCalendar('render');
    };
    // Retrieves the calendars via the API
    $scope.allCalendars = [];
    $scope.refreshCalendars = function() {
	var hardCalendar, dfrdCalendar, upcomingCalendar;
	// Hard scheduled tasks
	hardCalendar = {
	    calId: 1,
	    order: 10,
	    name: 'Scheduled tasks [HARD]',
	    color: 'rgb(92, 0, 92)',
	    textColor: 'white',
	    field_group: 'calendar',
	    events: Heading.query({field_group: 'calendar',
				   todo_state__abbreviation: 'HARD',
				   archived: false}),
	};
	// Deferred items/messages
	dfrdCalendar = {
	    calId: 2,
	    order: 20,
	    name: 'Reminders [DFRD]',
	    color: 'rgb(230, 138, 0)',
	    textColor: 'white',
	    field_group: 'calendar',
	    events: Heading.query({field_group: 'calendar',
				   todo_state__abbreviation: 'DFRD',
				   archived: false}),
	};
	// Upcoming deadlines
	upcomingCalendar = {
	    calId: 3,
	    order: 30,
	    name: 'Deadlines',
	    color: 'rgb(204, 0, 0)',
	    textColor: 'white',
	    field_group: 'calendar_deadlines',
	    events: Heading.query({field_group: 'calendar_deadlines',
				   deadline_date__gt: '1970-01-01',
				   archived: false}),
	};
	// Reset list of calendars
	$scope.allCalendars.length = 0;
	$scope.allCalendars.push(hardCalendar);
	$scope.allCalendars.push(dfrdCalendar);
	$scope.allCalendars.push(upcomingCalendar);
    };
    $scope.$on('refresh-data', $scope.refreshCalendars);
    $scope.refreshCalendars();
    // Handler for editing an event
    $scope.editEvent = function(obj) {
	var newScope, $off, modal;
	// Prepare and show the modal for editing the event
	newScope = $scope.$new(true);
	newScope.editableEvent = obj;
	modal = $modal.open({
	    scope: newScope,
	    templateUrl: 'edit-modal',
	    windowClass: 'calendar-edit'});
	// Listen for a response from the edit dialog
	$off = $scope.$on('finishEdit', function(e, newHeading) {
	    obj.$get();
	    modal.close();
	    $off();
	});
    };
    // Handler for drag & drop rescheduling
    $scope.moveEvent = function(obj, dayDelta, minuteDelta) {
	var newData, timeString, dateString, dateField, timeField;
	// Determine if scheduled or deadline fields will be used
	if (obj.field_group === 'calendar_deadlines') {
	    dateField = 'deadline_date';
	    timeField = 'deadline_time';
	} else {
	    dateField = 'scheduled_date';
	    timeField = 'scheduled_time';
	}
	// Day-specific
	newData = {id: obj.id};
	dateString = obj.start.getFullYear() + '-' + (obj.start.getMonth() + 1) + '-' + obj.start.getDate();
	newData[dateField] = dateString;
	if (!obj.allDay) {
	    // Time-specific
	    timeString = obj.start.getHours() + ':' + obj.start.getMinutes();
	    newData.scheduled_time = timeString;
	}
	Heading.update(newData);
    };
    // Callback for styling rendered events
    $scope.renderEvent = function(event, element) {
	// Verify if in active Scope
	if ($scope.activeFocusArea && $scope.activeFocusArea.id > 0) {
	    if (event.focus_areas.indexOf($scope.activeFocusArea.id) === -1) {
		return false;
	    }
	}
	// Repeating icon
	if (event.repeats) {
	    element.find('.fc-event-title')
		.append('<span class="repeat-icon"></span>');
	}
	if ($scope.activeCalendars.indexOf(event.calId) === -1) {
	    return false;
	}
    };
    // Callback for resizing events
    $scope.resizeEvent = function(event) {
	var newData, dateString, timeString;
	if (event.field_group === 'calendar') {
	    newData = {id: event.id};
	    dateString = event.end.getFullYear() + '-' + (event.end.getMonth() + 1) + '-' + event.end.getDate();
	    newData.end_date = dateString;
	    if (!event.allDay) {
		// Time-specific
		timeString = event.end.getHours() + ':' + event.end.getMinutes();
		newData.end_time = timeString;
	    }
	    Heading.update(newData);
	}
    };
    // Respond to changes in activeFocusArea
    $scope.$on('focus-area-changed', function(e, newFocusArea) {
	var i, newList;
	$scope.activeFocusArea = newFocusArea;
	$scope.owCalendar.fullCalendar('rerenderEvents');
    });
    // Calendar config object
    $scope.calendarOptions = {
        editable: true,
        header:{
          left: 'month agendaWeek agendaDay',
          center: 'title',
          right: 'today prev,next'
        },
        eventClick: $scope.editEvent,
        eventDrop: $scope.moveEvent,
        eventResize: $scope.resizeEvent,
	eventRender: $scope.renderEvent,
    };
    // $scope.toggleCalendar($scope.allCalendars[0]);
    /* event source that pulls from google.com */
    // $scope.eventSource = {
    //         url: "http://www.google.com/calendar/feeds/usa__en%40holiday.calendar.google.com/public/basic",
    //         className: 'gcal-event',           // an option!
    //         currentTimezone: 'America/Detroit' // an option!
    // };
    // $scope.events = [
    //  {title: 'All Day Event',start: new Date(y, m, 1)},
    //  {title: 'Long Event',start: new Date(y, m, d - 5),end: new Date(y, m, d - 2)},
    //  {id: 999,title: 'Repeating Event',start: new Date(y, m, d - 3, 16, 0),allDay: false},
    //  {id: 999,title: 'Repeating Event',start: new Date(y, m, d + 4, 16, 0),allDay: false},
    //  {title: 'Birthday Party',start: new Date(y, m, d + 1, 19, 0),end: new Date(y, m, d + 1, 22, 30),allDay: false},
    //  {title: 'Click for Google',start: new Date(y, m, 28),end: new Date(y, m, 29),url: 'http://google.com/'}
    // ];
    // $scope.eventsF = function (start, end, callback) {
    //   var s = new Date(start).getTime() / 1000;
    //   var e = new Date(end).getTime() / 1000;
    //   var m = new Date(start).getMonth();
    //   var events = [{title: 'Feed Me ' + m,start: s + (50000),end: s + (100000),allDay: false, className: ['customFeed']}];
    //   callback(events);
    // };

    // $scope.calEventsExt = {
    //    color: '#f00',
    //    textColor: 'yellow',
    //    events: [
    //       {type:'party',title: 'Lunch',start: new Date(y, m, d, 12, 0),end: new Date(y, m, d, 14, 0),allDay: false},
    //       {type:'party',title: 'Lunch 2',start: new Date(y, m, d, 12, 0),end: new Date(y, m, d, 14, 0),allDay: false},
    //       {type:'party',title: 'Click for Google',start: new Date(y, m, 28),end: new Date(y, m, 29),url: 'http://google.com/'}
    //     ]
    // };
    /* alert on eventClick */
    // $scope.alertOnEventClick = function( event, allDay, jsEvent, view ){
    //     $scope.alertMessage = (event.title + ' was clicked ');
    // };
    // /* alert on Drop */
    //  $scope.alertOnDrop = function(event, dayDelta, minuteDelta, allDay, revertFunc, jsEvent, ui, view){
    //    $scope.alertMessage = ('Event Droped to make dayDelta ' + dayDelta);
    // };
    // /* alert on Resize */
    // $scope.alertOnResize = function(event, dayDelta, minuteDelta, revertFunc, jsEvent, ui, view ){
    //    $scope.alertMessage = ('Event Resized to make dayDelta ' + minuteDelta);
    // };
    // add and removes an event source of choice
    // $scope.addRemoveEventSource = function(sources,source) {
    //   var canAdd = 0;
    //   angular.forEach(sources,function(value, key){
    //     if(sources[key] === source){
    //       sources.splice(key,1);
    //       canAdd = 1;
    //     }
    //   });
    //   if(canAdd === 0){
    //     sources.push(source);
    //   }
    // };
    // /* add custom event*/
    // $scope.addEvent = function() {
    //   $scope.events.push({
    //     title: 'Open Sesame',
    //     start: new Date(y, m, 28),
    //     end: new Date(y, m, 29),
    //     className: ['openSesame']
    //   });
    // };
    // /* remove event */
    // $scope.remove = function(index) {
    //   $scope.events.splice(index,1);
    // };
    // /* Change View */
    // $scope.changeView = function(view,calendar) {
    //   calendar.fullCalendar('changeView',view);
    // };
    // /* Change View */
    // $scope.renderCalender = function(calendar) {
    //   calendar.fullCalendar('render');
    // };

    /* event sources array*/
    // $scope.eventSources = [$scope.events, $scope.eventSource, $scope.eventsF];
    // $scope.eventSources2 = [$scope.calEventsExt, $scope.eventsF, $scope.events];

}]);
