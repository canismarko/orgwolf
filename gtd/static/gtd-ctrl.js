/*globals document, $, jQuery, Aloha, window, alert, GtdHeading, HeadingManager, angular, ga*/
"use strict";
var test_headings, owConfig, HeadingFactory, GtdListFactory, UpcomingFactory, outlineCtrl, listCtrl, ow_waiting;

/*************************************************
* Angular module for all GTD components
*
**************************************************/
var gtd_module = angular.module('orgWolf',
				['ngAnimate', 'ngResource', 'ngSanitize', 'ngRoute']);

/*************************************************
* Angular routing
*
**************************************************/
gtd_module.config(
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

gtd_module.config(['$httpProvider', '$locationProvider', owConfig]);
function owConfig($httpProvider, $locationProvider) {
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
}

/*************************************************
* Run setup gets some app-wide data
*
**************************************************/
gtd_module.run(['$rootScope', '$resource', function($rootScope, $resource) {
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
* Handler sends goole analytics tracking on
* angular route change
**************************************************/
gtd_module.run(['$rootScope', '$location', function($rootScope, $location) {
    $rootScope.$on('$routeChangeSuccess', function() {
	// Only active if django DEBUG == True
	if ( typeof ga !== 'undefined' ) {
	    ga('send', 'pageview', {'page': $location.path()});
	}
    });
}]);

/*************************************************
* Factory creates GtdHeading objects
*
**************************************************/
gtd_module.factory('OldHeading', ['$resource', '$http', function($resource, $http) {
    return function(data) {
        return new GtdHeading(data);
    };
}]);
gtd_module.factory('Heading', ['$resource', '$http', HeadingFactory]);
function HeadingFactory($resource, $http) {
    var res = $resource(
	'/gtd/node/:pk/',
	{pk: '@pk'},
	{
	    'query': {
		method: 'GET',
		transformResponse: $http.defaults.transformResponse.concat([
		    function (data, headersGetter) {
			return data;
		    }
		]),
		isArray: true
	    },
	}
    );
    return res;
}

/*************************************************
* Factory creates resource for list of nodes with
* upcoming deadlines
*
**************************************************/
gtd_module.factory('Upcoming', ['$resource', '$http', UpcomingFactory]);
function UpcomingFactory($resource, $http) {
    var res = $resource(
	'/gtd/node/upcoming/',
	{},
	{
	    'query': {
		method: 'GET',
		transformResponse: $http.defaults.transformResponse.concat([
		    function (data, headersGetter) {
			return data;
		    }
		]),
		isArray: true
	    },
	}
    );
    return res;
}

/*************************************************
* Factory creates next actions list $resource
*
**************************************************/
gtd_module.factory(
    'GtdList',
    ['$resource', '$http', GtdListFactory]
);
function GtdListFactory($resource, $http) {
    var res = $resource(
	'/gtd/lists/', {},
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
}

/*************************************************
* Filter that determines object color
*
**************************************************/
gtd_module.filter('is_target', function() {
    return function(obj, active) {
	var answer = '';
	if (active) {
	    if ( obj.pk === active.id ) {
		answer = 'yes';
	    } else if ( obj.fields.tree_id === active.tree_id &&
			obj.fields.lft < active.lft &&
			obj.fields.rght > active.rght) {
		// Mark ancestors
		answer = 'ancestor';
	    }
	}
	return answer;
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
	} else {// gtd.node model
	    // Determine color based on node.rank
	    if ( obj.fields.level > 0 ) {
		colors = ['rgb(88, 0, 176)', 'rgb(80, 0, 0)', 'rgb(0, 44, 19)',
			  'teal', 'slateblue', 'brown'];
		color_i = (obj.fields.level) % colors.length;
		style += 'color: ' + colors[color_i] + '; ';
	    }
	}
	return style;
    };
});

/*************************************************
* Sanitizes text to safe HTML
*
**************************************************/
gtd_module.filter('asHtml', ['$sce', function($sce) {
    return function(obj) {
	var s = $sce.trustAsHtml(obj);
	return s;
    };
}]);

/*************************************************
* Filter that orders top level headings
*
**************************************************/
gtd_module.filter('order', ['$sce', function($sce) {
    return function(obj, criterion) {
	var ordered, deadline, other;
	if ( criterion === 'list' ) {
	    other = obj.filter_by({deadline_date: null});
	    deadline = $(obj).not(other).get().order_by('deadline_date');
	    ordered = deadline;
	    ordered = ordered.concat(other.order_by('priority'));
	} else {
	    ordered = obj.order_by(criterion);
	}
	return ordered;
    };
}]);

/*************************************************
* Filter that creates a link to the list item's
* tree root heading.
*
**************************************************/
gtd_module.filter('root_cell', ['$sce', function($sce) {
    return function(obj) {
	var parent, s;
	s = '';
	parent = obj.workspace.parents.get({tree_id: obj.fields.tree_id,
					    level: 0});
	if ( parent ) {
	    // s += '<a href="/gtd/lists/parent' + parent.pk + '/">';
	    s += '<a>';
	    s += parent.fields.title + '</a>';
	}
	s = $sce.trustAsHtml(s);
	return s;
    };
}]);

/*************************************************
* Filter that displays the deadline for a heading
*
**************************************************/
gtd_module.filter('deadline_str', ['$sce', function($sce) {
    return function(heading) {
	var str, date, today, time_delta, day_delta;
	str = '';
	if ( heading.fields.deadline_date ) {
	    str = 'Due ';
	    date = new Date(heading.fields.deadline_date + 'T12:00:00');
	    today = new Date();
	    today.setHours(12, 0, 0, 0);
	    time_delta = date.getTime() - today.getTime();
	    day_delta = Math.ceil(time_delta / (1000 * 3600 * 24));
	    if ( day_delta === 0 ) {
		// Is today
		str += 'today';
	    } else if (day_delta === -1) {
		// Is yesterday
		str += 'yesterday';
	    } else if (day_delta < 0) {
		// Is farther in the past
		str += Math.abs(day_delta) + ' days ago';
	    } else if (day_delta === 1) {
		// Is tomorrow
		str += 'tomorrow';
	    } else if (day_delta > 0) {
		// Is farther in the future
		str += 'in ' + day_delta + ' days';
	    }
	}
	return str;
    };
}]);

/*************************************************
* Directive that turns checkboxes into switches
*
**************************************************/
gtd_module.directive('owSwitch', function() {
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
* Directive that lets a user edit a node
*
**************************************************/
gtd_module.directive('owEditable', function($resource) {
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
	Aloha.ready( function() {
	    Aloha.jQuery(element.find('.edit-text')).aloha();
	});
    }
    return {
	link: link,
	require: '?ngModel',
	templateUrl: '/static/editable.html'
    };
});

/*************************************************
* Directive that shows a list of Scopes tabs
*
**************************************************/
gtd_module.directive('owScopeTabs', ['$resource', function($resource) {
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
gtd_module.directive('owTodo', ['$filter', function($filter) {
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
gtd_module.directive('owListRow', function() {
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

/*************************************************
* Angular controller for capturing quick thoughts
* to the inbox
**************************************************/
gtd_module.controller(
    'inboxCapture',
    ['$scope', '$rootScope',
    function ($scope, $rootScope) {
	$scope.capture = function(e) {
	    // Send a captured inbox item to the server for processing
	    var text, data, $textbox;
	    data = {handler_path: 'plugins.quickcapture'};
	    $textbox = $(e.target).find('#new_inbox_item');
	    data.subject = $textbox.val();
	    ow_waiting('spinner.inbox');
	    $.ajax(
		'/wolfmail/message/',
		{type: 'POST',
		 data: data,
		 complete: function() {
		     ow_waiting('clear.inbox');
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
gtd_module.controller(
    'nodeOutline',
    ['$scope', '$http', '$resource', 'OldHeading', 'Heading',
     '$location', '$anchorScroll', outlineCtrl]
);
function outlineCtrl($scope, $http, $resource, OldHeading, Heading,
		     $location, $anchorScroll) {
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
gtd_module.controller(
    'nextActionsList',
    ['$sce', '$scope', '$resource', '$location', '$routeParams', 'GtdList', 'Heading', 'Upcoming', listCtrl]
);
function listCtrl($sce, $scope, $resource, $location, $routeParams, GtdList, Heading, Upcoming) {
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
    $scope.list_params.todo_state = $scope.active_states;
    // Get list of hard scheduled commitments
    today = new Date();
    $scope.scheduled = new HeadingManager($scope);
    $scope.scheduled.add(Heading.query(
	{
	    field_group: 'actions_list',
	    scheduled_date__lte: today.ow_date(),
	    todo_state: 8
	}
    ));
    // Helper function that retrieves new GTD list from server
    get_list = function(scp) {
	$scope.headings = new HeadingManager(scp);
	scp.headings.add(GtdList.query(scp.list_params));
	$scope.headings.add(Upcoming.query());
    };
    get_list($scope);
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
