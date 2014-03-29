// Jasmine tests for Getting Things Done javascript (mostly angular)
var customMatchers, $rootScope;
var customMatchers = {
    toHaveClass: function(utils) {
	// Checks that element has HTML class ala jQuery().hasClass()
	return {
	    compare: function(element, cls) {
		result = {};
		result.pass = element.hasClass(cls);
		return result;
	    }
	};
    }
};
beforeEach(function() {
    jasmine.addMatchers(customMatchers);
});

describe('filters in gtd-filters.js', function() {
    beforeEach(module('owFilters'))
    describe('the "is_target" filter', function () {
	var is_targetFilter;
	beforeEach(inject(function(_is_targetFilter_) {
    	    is_targetFilter = _is_targetFilter_
	}));

	it('identifies active heading', function() {
    	    var heading = {pk: 1};
    	    var active_heading = {id: 1};
    	    expect(is_targetFilter(heading, active_heading)).toEqual('yes');
	});
	it('identifies ancestor heading', function() {
	    var heading = {
		pk: 1,
		fields: {tree_id: 1, lft: 1, rght: 4},
	    };
	    var active_heading = {
		id: 2,
		tree_id: 1,
		lft: 2,
		rght: 3
	    };
	    expect(is_targetFilter(heading, active_heading)).toEqual('ancestor');
	});
    });

    describe('the "headingStyle" filter', function() {
	var headingStyleFilter;
	beforeEach(inject(function(_headingStyleFilter_) {
	    headingStyleFilter = _headingStyleFilter_;
	}));
	it('determines heading color based on level', function() {
	    lvlOneHeading = {level: 1};
	    lvlTwoHeading = {level: 2};
	    lvlSixHeading = {level: 6};
	    expect(headingStyleFilter(lvlOneHeading)).toEqual('color: rgb(80, 0, 0); ');
	    expect(headingStyleFilter(lvlTwoHeading)).toEqual('color: rgb(0, 44, 19); ');
	    expect(headingStyleFilter(lvlSixHeading)).toEqual('color: rgb(80, 0, 0); ');
	});
    });

    describe('the "todoStateStyle" filter', function() {
	var todoStateStyleFilter;
	beforeEach(inject(function(_todoStateStyleFilter_) {
	    todoStateStyleFilter = _todoStateStyleFilter_;
	}));
	it('translates the todo_state\'s color', function() {
	    colorlessState = {
		color: {
		    red: 0,
		    green: 0,
		    blue: 0,
		    alpha: 0
		}
	    };
    	    expect(todoStateStyleFilter(colorlessState)).toEqual('color: rgba(0, 0, 0, 0); ');
	    redState = {
		color: {
		    red: 204,
		    green: 0,
		    blue: 0,
		    alpha: 0.5
		}
	    };
    	    expect(todoStateStyleFilter(redState)).toEqual('color: rgba(204, 0, 0, 0.5); ');
	});
    });

    describe('the "order" filter', function() {
	var orderFilter;
	beforeEach(inject(function(_orderFilter_) {
	    orderFilter = _orderFilter_;
	}));
	it('sorts by criterion', function() {
	    unsorted_data = [{'key': 'bravo'}, {'key': 'alpha'},
			     {'key': 'delta'}, {'key': 'charlie'}];
	    sorted_data = [{'key': 'alpha'}, {'key': 'bravo'},
			     {'key': 'charlie'}, {'key': 'delta'}];
	    expect(orderFilter(unsorted_data, 'key')).toEqual(sorted_data);
	});
	describe('when passed the \'list\' option', function() {
	    it('puts nodes in deadline order', function() {
		unsorted_data = [{'deadline_date': '2014-01-02'},
				 {'deadline_date': '2013-12-20'},
				 {'deadline_date': '2013-12-26'}];
		sorted_data = [{'deadline_date': '2013-12-20'},
			       {'deadline_date': '2013-12-26'},
			       {'deadline_date': '2014-01-02'}];
		expect(orderFilter(unsorted_data, 'list')).toEqual(sorted_data);
	    });
	    it('puts nodes without a deadline at the end', function() {
		unsorted_data = [{'deadline_date': null},
				 {'deadline_date': '2013-12-26'},
				 {'deadline_date': '2014-01-02'}];
		sorted_data = [{'deadline_date': '2013-12-26'},
			       {'deadline_date': '2014-01-02'},
			       {'deadline_date': null}];
		expect(orderFilter(unsorted_data, 'list')).toEqual(sorted_data);
	    });
	});
    });

    describe('the "currentList" filter', function() {
	var currentListFilter, headings;
	beforeEach(inject(function(_currentListFilter_) {
	    currentListFilter = _currentListFilter_;
	    headings = [
		{id: 1,
		 todo_state: 1,
		 scope: [1]},
		{id: 2,
		 todo_state: 2,
		 scope: []},
	    ];
	}));
	it('passes the array back if no parameters given', function() {
	    result = currentListFilter(headings);
	    expect(result).toBe(headings);
	});
	it('filters by active todoState', function() {
	    result = currentListFilter(headings, [1]);
	    expect(result.length).toEqual(1);
	    expect(result[0]).toBe(headings[0]);
	});
	it('filters out headings that are also on the upcoming list', function() {
	    upcomingList = [
		{id: 2},
		{id: 3},
	    ];
	    headings[1].deadline_date = '2014-03-08';
	    result = currentListFilter(headings, [1, 2], upcomingList);
	    expect(result.length).toEqual(1);
	    expect(result[0]).toBe(headings[0]);
	});
    });

    describe('the "currentScope" filter', function() {
	var currentScopeFilter;
	beforeEach(inject(function(_currentScopeFilter_) {
	    currentScopeFilter = _currentScopeFilter_;
	    headings = [
		{id: 1,
		 todo_state: 1,
		 scope: [1]},
		{id: 2,
		 todo_state: 2,
		 scope: []},
	    ]
	}));
	it('filters by scope', function() {
	    result = currentScopeFilter(headings, {id: 1});
	    expect(result.length).toEqual(1);
	    expect(JSON.stringify(result[0]))
		.toEqual(JSON.stringify(headings[0]));
	});
    });

    describe('the "deadline_str" filter', function() {
	var deadline_strFilter, today, heading, due_date;
	beforeEach(inject(function(_deadline_strFilter_) {
	    deadline_strFilter = _deadline_strFilter_;
	    today = new Date(2014, 02, 21, 18, 1, 1);
	    due_date = new Date(2014, 02, 21, 18, 1, 1);
	}));
	it('returns "" for a heading without a due date', function() {
	    heading = {fields: {deadline_date: null}};
	    expect(deadline_strFilter(heading)).toEqual('');
	});
	it('describes a heading due in the future', function() {
	    due_date.setDate(due_date.getDate() + 2);
	    due_date = due_date.toISOString().slice(0, 10);
	    heading = {deadline_date: due_date};
	    expect(deadline_strFilter(heading, today)).toEqual('Due in 2 days');
	});
	it('describes a heading due in the past', function() {
	    due_date.setDate(due_date.getDate() - 2);
	    due_date = due_date.toISOString().slice(0, 10);
	    heading = {deadline_date: due_date};
	    expect(deadline_strFilter(heading, today)).toEqual('Due 2 days ago');
	});
	it('identifies a heading due today', function() {
	    due_date = today.toISOString().slice(0, 10);
	    heading = {deadline_date: due_date};
	    expect(deadline_strFilter(heading, today)).toEqual('Due today');
	});
	it('identifies a heading due tomorrow', function() {
	    due_date.setDate(due_date.getDate() + 1);
	    due_date = due_date.toISOString().slice(0, 10);
	    heading = {deadline_date: due_date};
	    expect(deadline_strFilter(heading, today)).toEqual('Due tomorrow');
	});
	it('identifies a heading due yesterday', function() {
	    due_date.setDate(due_date.getDate() - 1);
	    due_date = due_date.toISOString().slice(0, 10);
	    heading = {deadline_date: due_date};
	    expect(deadline_strFilter(heading, today)).toEqual('Due yesterday');
	});
    });

    describe('the scope filter', function() {
	var dummyHeadings;
	beforeEach(inject(function(_scopeFilter_) {
	    scopeFilter = _scopeFilter_;
	    dummyHeadings = [
		{id: 1,
		 scope: [1, 2]},
		{id: 2,
		 scope: [1]},
		{id: 3,
		 scope: []},
		{id: 4,
		 scope: [6]}
	    ];
	}));

	it('filters headings based on active scope', function() {
	    var filteredList = scopeFilter(dummyHeadings, 2);
	    expect(filteredList.length).toBe(1);
	    expect(JSON.stringify(filteredList[0]))
		.toEqual(JSON.stringify( dummyHeadings[0] ));
	});

	it('allows all headings if no active scope', function() {
	    var filteredList = scopeFilter(dummyHeadings, undefined);
	    expect(filteredList).toEqual(dummyHeadings);
	});

    });
});

describe('directives in gtd-directives.js', function() {
    var $compile, $rootScope, $httpBackend, $templateCache, element, dummyStates;
    beforeEach(module('owDirectives', 'owFilters', 'owServices'));
    beforeEach(inject(function($injector) {
	$compile = $injector.get('$compile');
	$rootScope = $injector.get('$rootScope');
	// Mock global data (scopes, todo-states, etc)
	dummyStates = [
	    {
		id: 1,
		color: {
		    red: 0,
		    green: 0,
		    blue: 0,
		    alpha: 0,
		}
	    },
	    {
		id: 2,
		color: {
		    red: 0,
		    green: 0,
		    blue: 0,
		    alpha: 0,
		}
	    }
	];
	$httpBackend = $injector.get('$httpBackend');
	$httpBackend.whenGET('/gtd/todostate').respond(201, dummyStates);
	$templateCache = $injector.get('$templateCache');
    }));
    // Reset httpBackend calls
    afterEach(function() {
	$httpBackend.verifyNoOutstandingExpectation();
    });

    describe('the owPersona directive', function() {
	var watchCalled, requestCalled, logoutCalled;
	owServices.factory('personaNavigator', function() {
	    return {
		id: {
		    watch: function() {
			watchCalled = true;
		    },
		    request: function() {
			requestCalled = true;
		    },
		    logout: function() {
			logoutCalled = true;
		    }
		}
	    };
	});
	beforeEach(function() {
	    // Mock persona navigator
	    watchCalled = false;
	    requestCalled = false;
	    logoutCalled = false;
	    element = $compile(
		'<button ow-persona></button>'
	    )($rootScope);
	});
	// it('calls navigator.id.watch on init', function() {
	//     expect(watchCalled).toBeTruthy();
	// });
	// it('calls navigator.id.request on login', function() {
	//     scope = element.isolateScope();
	//     scope.login();
	//     expect(requestCalled).toBeTruthy();
	// });
	// it('calls navigator.id.logout on logout', function() {
	//     scope = element.isolateScope();
	//     scope.logout();
	//     expect(logoutCalled).toBeTruthy();
	// });
    });

    describe('the owWaitFeedback directive', function() {
    	beforeEach(function() {
    	    element = $compile(
    		'<div ow-wait-feedback><</div>'
    	    )($rootScope);
    	});

    });

    describe('the owSwitch directive', function() {
	beforeEach(function() {
	    $rootScope.modelValue = false;
	    element = $compile(
		'<div ow-switch ng-model="modelValue"><input ng-model="modelValue"></input></div>'
	    )($rootScope);
	});

	it('attaches the bootstrap-switch plugin', function() {
	    expect(element.children('div')).toHaveClass('has-switch');
	});
    });

    describe('the owCurrentDate directive', function() {
    });

    describe('the owDetails directive', function() {
    	beforeEach(inject(function(Heading) {
    	    $templateCache.put('/static/details.html',
    	    		       '<div class="details"></div>');
    	    heading = {
    		id: 2,
    		title: 'Hello, world',
		scope: [1, 2]
    	    };
	    $httpBackend.whenGET('/gtd/nodes/2').respond(200, heading);
	    $rootScope.heading = Heading.get({id: 2});
	    $rootScope.scopes = [
		{id: 1, display: 'Work'},
		{id: 2, display: 'Home'}
	    ];
	    $httpBackend.flush();
    	    element = $compile(
    		'<div ow-details ow-heading="heading"></div>'
    	    )($rootScope);
	    $httpBackend.flush();
    	}));
	it('sets scope.focusAreas', function() {
	    scope = element.isolateScope();
	    expect(scope.focusAreas.length).toEqual(2);
	    expect(scope.focusAreas[0]).toEqual('Work');
	});
    });

    describe('the owEditable directive', function() {
	var fullNode;
	beforeEach(function() {
	    // Mock the templateUrl lookup
	    $templateCache.put('/static/editable.html',
			       '<div class="editable"></div>');
	});
	describe('when an existing node is being edited ([ow-heading])', function() {
	    beforeEach(function() {
		// Prepare the DOM element
		element = $compile(
		    '<div ow-editable ow-heading="heading"></div>'
		)($rootScope);
		// Fake heading for processing the directive
		fullNode = {
		    id: 2,
		    title: 'full dummy node 1'
		}
		$rootScope.heading = {
		    id: 2,
		};
		$httpBackend.expect('GET', '/gtd/nodes/2').respond(201, fullNode);
	    });

	    it('retrieves the heading object from the server', function() {
		$httpBackend.flush();
		$rootScope.$digest();
		expect(element.isolateScope().fields.title).toBe(fullNode.title);
	    });
	});
	describe('when a new node is being created ([ow-parent])', function() {
	    var parentScope;
	    beforeEach(function() {
		element = $compile(
		    '<div ow-editable ow-parent="heading"></div>'
		)($rootScope);
		parentScope = [1, 2];
		$rootScope.heading = {
		    id: 1,
		    title: 'Root-level node 1',
		    scope: parentScope,
		    priority: 'A'
		};
	    });
	    it('inherits the parent $rootScope.scopes attribute', function() {
		var dummyScopes = [{pk: 1, title: 'scp 1'},
				   {pk: 2, title: 'scp 2'}];
		$rootScope.scopes = dummyScopes;
		$rootScope.$digest();
		expect(element.isolateScope().scopes).toEqual(dummyScopes);
	    });

	    it('inherits parent\'s fields if creating a new node (priority and scope)', function() {
		$rootScope.$digest();
		expect(element.isolateScope().fields.scope).toEqual(parentScope);
		expect(element.isolateScope().fields.priority).toEqual('A');
	    });
	});
	describe('when a new root-level node is being created (no attrs)', function() {
	    beforeEach(function() {
		element = $compile('<div ow-editable></div>')($rootScope);
	    });
	    it('creates a new root-level node', function() {
		// Simulate the $scope the is return from get_parent() for a top-level node
		$rootScope.$digest();
		expect(element.isolateScope().fields.scope).toEqual([]);
		expect(element.isolateScope().fields.priority).toEqual('B');
	    });

	    it('adds the ow-editable class (for animations)', function() {
		$rootScope.$digest();
		expect(element).toHaveClass('ow-editable');
	    });
	});
    });

    describe('the owScopeTabs directive', function() {
	var $childScope;
	beforeEach(function() {
	    $rootScope.scopes = [
		{id: 1},
		{id: 2},
	    ];
	    $templateCache.put(
		'/static/scope-tabs.html',
		'<ul><li id="scope-tab-{{ scope.id }}" ng-repeat="scope in owScopes"></li></ul>'
	    );
	    element = $compile(
		'<div ow-scope-tabs></div>'
	    )($rootScope);
	});
	it('emits the "change-scope" event on changeScope()', function() {
	    var emittedStatus, targetScope;
	    $rootScope.$digest();
	    $childScope = element.isolateScope();
	    targetScope = $rootScope.scopes[0];
	    expect($childScope).toBeDefined();
	    $rootScope.$on('scope-changed', function(e, newScope) {
		emittedStatus = true;
		emittedScope = newScope;
	    });
	    $childScope.changeScope(targetScope);
	    expect(emittedStatus).toBeTruthy();
	    expect(emittedScope).toBe(targetScope);
	});
	it('emits with argument "null" if newScope is 0', function() {
	    var targetScope, emittedScope;
	    $rootScope.$digest();
	    $childScope = element.isolateScope();
	    nullScope = $childScope.owScopes[0];
	    $rootScope.$on('scope-changed', function(e, newScope) {
		emittedScope = newScope;
	    });
	    $childScope.changeScope(nullScope);
	    expect(emittedScope).toBe(null);
	   });
	it('sets scope.activeScope on changeScope()', function() {
	    var newScope;
	    newScope = $rootScope.scopes[0];
	    $rootScope.$digest();
	    $childScope = element.isolateScope();
	    $childScope.changeScope(newScope);
	    expect($childScope.activeScope).toBe(newScope);
	});
	it('moves the "active" class to a tab on changeScope()', function() {
	    var newScope = $rootScope.scopes[0];
	    $rootScope.$digest();
	    // Set the first scope
	    $childScope = element.isolateScope();
	    $childScope.changeScope(newScope);
	    expect(element.find('#scope-tab-1')).toHaveClass('active');
	    expect(element.find('#scope-tab-2')).not.toHaveClass('active');
	    // Now change the scope
	    newScope = $rootScope.scopes[1];
	    $childScope.changeScope(newScope)
	    expect(element.find('#scope-tab-2')).toHaveClass('active');
	    expect(element.find('#scope-tab-1')).not.toHaveClass('active');
	});
    });

    describe('the owTodo directive', function() {
	var $scope;
	beforeEach(function() {
	    $rootScope.heading = {
		todo_state: 1,
		// $update: function() {},
	    };
	    $templateCache.put('/static/todo-state-selector.html',
			       '<select ng-model="todoStateId"></div>');
	    // Prepare the DOM element
	    element = $compile(
		'<div ow-todo ow-heading="heading"></div>'
	    )($rootScope);
	    $httpBackend.flush();
	});

	it('does not call heading.$update during initialization', function() {
	    var hitApi = false;
	    $rootScope.heading.$update = function() {
		hitApi = true;
	    };
	    $rootScope.$digest();
	    expect(hitApi).toEqual(false);
	});

	// it('sets scope.todoState during initialization', function() {
	//     var scope;
	//     $rootScope.$digest();
	//     scope = element.isolateScope();
	//     expect(scope.todoStateId)
	// 	.toEqual($rootScope.heading.todo_state);
	//     expectedState = dummyStates.filter(
	// 	function(o) {return o.id===1;}
	//     )[0];
	//     expect(scope.todoState).toBe(expectedState);
	// });

	it('updates models when todoStateId changes', function() {
	    var scope, expectedState;
	    $rootScope.heading.$update = function() {};
	    $rootScope.$digest();
	    scope = element.isolateScope();
	    scope.todoStateId = 2;
	    $rootScope.$digest();
	    expectedState = dummyStates.filter(
		function(o) {return o.id===2;}
	    )[0];
	    expect(JSON.stringify(scope.todoState))
		.toEqual(JSON.stringify(expectedState));
	    expect(scope.todoStateId).toEqual(2);
	    expect($rootScope.heading.todo_state).toEqual(2);
	});

	it('responds to changes in $parent.heading.todo_state', function() {
	    $rootScope.$digest();
	    $rootScope.heading.todo_state = 2;
	    $rootScope.$digest();
	    expect(element.isolateScope().todoStateId).toEqual(2);
	});
    });

    describe('the owListRow directive', function() {
	beforeEach(function() {
	    $rootScope.heading = {
		id: 1,
		lft: 1,
		rght: 2,
		tag_string: ''
	    }
	    $templateCache.put('/static/actions-list-row.html',
	    		       '<div></div>');
	    // Prepare the DOM element
	    element = $compile(
		'<div ow-list-row ow-heading="heading" ow-date="Due today"></div>'
	    )($rootScope);;
	});

	it('sets isEditable when edit() is called', function() {
	    var scope;
	    $rootScope.$digest();
	    scope = element.isolateScope();
	    scope.edit();
	    expect(scope.isEditable).toBeTruthy();
	});

	it('catches the finishEdit signal', function() {
	    var parentScope, childScope;
	    $rootScope.$digest();
	    parentScope = element.isolateScope();
	    parentScope.edit();
	    expect(parentScope.isEditable).toBeTruthy();
	    childScope = parentScope.$new();
	    childScope.$emit('finishEdit');
	    expect(parentScope.isEditable).toBeFalsy();
	});
    });

    describe('the owTwisty directive', function() {
	beforeEach(function() {
	    $rootScope.heading = {
		id: 1,
		lft: 1,
		rght: 6,
		tree_id: 1,
		tag_string: ''
	    }
	    $templateCache.put('/static/outline-twisty.html',
			       '<div class="ow-hoverable"></div>');
	    // Prepare the DOM element
	    element = $compile(
		'<div ow-twisty ow-heading="heading" ng-click="toggleHeading($event)"></div>'
	    )($rootScope);;
	});
	describe('expandability DOM classes', function() {
	    it('identifies an unexapndable heading', function() {
		$rootScope.$digest();
		expect(element.find('.ow-hoverable')).toHaveClass('not-expandable');
	    });
	    it('identifies a heading with children as lazy-expandable', function() {
		$rootScope.text = '';
		$rootScope.heading.lft = 1;
		$rootScope.heading.rght = 4;
		$rootScope.$digest();
		expect(element.find('.ow-hoverable')).toHaveClass('lazy-expandable');
	    });
	    it('identifies a heading with text as expandable', function() {
		$rootScope.heading.lft = 1;
		$rootScope.heading.rght = 4; // Catch .lazy-expandable bug
		$rootScope.heading.text = 'Batman rules!';
		$rootScope.$digest();
		expect(element.find('.ow-hoverable')).toHaveClass('expandable');
	    });
	});
	it('processes the tag_string', function() {
	    var tags = ['home', 'work'];
	    $rootScope.heading.tag_string = ':home:work:';
	    $rootScope.$digest();
	    expect(element.isolateScope().tags).toEqual(tags);
	});
	it('gets children when opened', function() {
	    var children = [
		{id: 2},
		{id: 3},
	    ];
	    $httpBackend.expect('GET', '/gtd/nodes?field_group=outline&parent_id=1')
		.respond(200, children);
	    $rootScope.$digest();
	    element.isolateScope().toggleHeading({target: element});
	    $rootScope.$digest();
	    $httpBackend.flush();
	    expect(JSON.stringify(element.isolateScope().children))
		.toEqual(JSON.stringify(children));
	    expect(element.isolateScope().loadedChildren).toBe(true);
	});
	it('gets children when created if not root level', function() {
	    // Prepare the DOM element
	    $scope = $rootScope.$new();
	    $scope.heading = {
		id: 2,
		lft: 2,
		rght: 5,
		tree_id: 1,
		level: 1,
		tag_string: ''
	    };
	    $httpBackend.expectGET(
	    	'/gtd/nodes?field_group=outline&parent_id=2'
	    ).respond(200, []);
	    element = $compile(
		'<div ow-twisty ow-heading="heading" ng-click="toggleHeading($event)"></div>'
	    )($scope);
	    $rootScope.$digest();
	    $httpBackend.flush();
	    scope = element.isolateScope();
	    expect(typeof scope.getChildren).toEqual('function');
	});
	it('does not get children if heading is a leaf node', function() {
	    // Prepare the DOM element
	    $scope = $rootScope.$new();
	    $scope.heading = {
		id: 2,
		lft: 2,
		rght: 3,
		tree_id: 1,
		level: 1,
		tag_string: ''
	    };
	    element = $compile(
		'<div ow-twisty ow-heading="heading" ng-click="toggleHeading($event)"></div>'
	    )($scope);
	    $rootScope.$digest();
	    scope = element.isolateScope();
	});
	it('responds to the open-descendants signal', function() {
	    $httpBackend.expectGET('/gtd/nodes?field_group=outline&parent_id=1').respond(200, []);
	    $rootScope.$digest();
	    $scope = element.isolateScope();
	    expect($scope.state).toBe(0);
	    $rootScope.$broadcast('open-descendants');
	    expect($scope.state).toBe(1);
	});
	it('cycles through all states when toggled', function() {
	    $httpBackend.expectGET('/gtd/nodes?field_group=outline&parent_id=1').respond(200, []);
	    $rootScope.$digest();
	    scope = element.isolateScope();
	    expect(scope.state).toEqual(0);
	    scope.toggleHeading({target: element});
	    $httpBackend.flush();
	    expect(scope.state).toEqual(1);
	    expect(element).toHaveClass('state-1');
	    scope.toggleHeading({target: element});
	    expect(element).toHaveClass('state-2');
	    expect(element).not.toHaveClass('state-1');
	    expect(scope.state).toEqual(2);
	    scope.toggleHeading({target: element});
	    expect(scope.state).toEqual(0);
	});
	it('broadcasts open-descendants on state 2', function() {
	    $httpBackend.expectGET('/gtd/nodes?field_group=outline&parent_id=1').respond(200, []);
	    $rootScope.$digest();
	    scope = element.isolateScope();
	    childScope = scope.$new();
	    var signalCaught = false;
	    childScope.$on('open-descendants', function() {
		signalCaught = true;
	    });
	    expect(scope.state).toEqual(0);
	    scope.toggleHeading({target: element});
	    $httpBackend.flush();
	    scope.toggleHeading({target: element});
	    expect(signalCaught).toBe(true);
	});
	it('allows the state to be toggled directly', function() {
	    $httpBackend.expectGET('/gtd/nodes?field_group=outline&parent_id=1').respond(200, []);
	    $rootScope.$digest();
	    scope = element.isolateScope();
	    expect(scope.state).toEqual(0);
	    scope.toggleHeading(1);
	    $httpBackend.flush();
	    expect(scope.state).toEqual(1);
	    scope.toggleHeading(5);
	    expect(scope.state).toEqual(2);
	});
    });
}); // End of gtd-directives.js tests

describe('services in gtd-services.js', function() {
    beforeEach(module('owServices'));
    describe('the owWaitIndicator service', function() {
	var waiting, $rootScope;
	beforeEach(inject(function($injector) {
	    waitIndicator = $injector.get('owWaitIndicator');
	    $rootScope = $injector.get('$rootScope');
	}));
	it('adds a new short wait period to the list', function() {
	    waitIndicator.start_wait('quick', 'test');
	    expect(waitIndicator.waitLists['quick'].length).toEqual(1);
	});
	it('clears a short wait period from the list', function() {
	    // Add two similar waiting periods...
	    waitIndicator.start_wait('quick', 'tests');
	    waitIndicator.start_wait('quick', 'tests');
	    // ...then remove them
	    waitIndicator.end_wait('quick', 'tests');
	    expect(waitIndicator.waitLists['quick'].length).toEqual(0);
	});
	it('adds a new medium wait period to the list', function() {
	    waitIndicator.start_wait('medium', 'test');
	    expect(waitIndicator.waitLists['medium'].length).toEqual(1);
	});
	it('clears a medium wait period from the list', function() {
	    // Add two similar waiting periods...
	    waitIndicator.start_wait('medium', 'tests');
	    waitIndicator.start_wait('medium', 'tests');
	    // ...then remove them
	    waitIndicator.end_wait('medium', 'tests');
	    expect(waitIndicator.waitLists['medium'].length).toEqual(0);
	});
	it('clears all wait lists if no duration is given', function() {
	    waitIndicator.start_wait('quick', 'tests');
	    waitIndicator.start_wait('medium', 'tests');
	    waitIndicator.end_wait('tests');
	    expect(waitIndicator.waitLists['quick'].length).toEqual(0);
	    expect(waitIndicator.waitLists['medium'].length).toEqual(0);
	});
    });

    describe('the Heading service', function() {
	var Heading, heading, $rootScope, $httpBackend;
	beforeEach(inject(function($injector) {
	    $httpBackend = $injector.get('$httpBackend');
	    // Create a mocked Heading object
	    $httpBackend.when('GET', '/gtd/nodes/1')
	    	.respond(201, {
		    id: 1,
		    title: 'test heading 1'
		});
	    Heading = $injector.get('Heading');
	    heading = Heading.get({id: 1});
	    $httpBackend.flush();
	}));

	afterEach(function() {
            $httpBackend.verifyNoOutstandingExpectation();
	});

	it('uses the PUT method to update', function() {
	    $httpBackend.expect('PUT', '/gtd/nodes/1')
		.respond(201, {});
	    heading.$update();
	    $httpBackend.flush();
	});

	it('uses the POST method to update', function() {
	    $httpBackend.expect('POST', '/gtd/nodes')
		.respond(201, {});
	    Heading.create({title: 'hello'});
	    $httpBackend.flush();
	});
    });

    describe('the TodoState service', function() {
	var todoStates, $httpBackend, mockedStates;
	beforeEach(inject(function($injector) {
	    mockedStates = [
		{id: 1},
		{id: 2},
	    ];
	    todoStates = $injector.get('todoStates');
	    $httpBackend = $injector.get('$httpBackend');
	    $httpBackend.whenGET('/gtd/todostate').respond(201, mockedStates);
	}));
	it('sets the getState() method', function() {
	    $httpBackend.flush();
	    expect(todoStates.getState(1).id).toEqual(1);
	});
    });
}); // End of gtd-services.js tests

describe('controllers in gtd-main.js', function() {
    var dummyStates;
    beforeEach(module('owMain'));
    beforeEach(function() {
	dummyStates = [
	    {id: 1},
	    {id: 2},
	]
    });
    describe('nextActionsList controller', function() {
	var $httpBackend
	beforeEach(inject(function($rootScope, $controller, _$httpBackend_) {
	    $httpBackend = _$httpBackend_
	    $httpBackend.whenGET('/gtd/todostate').respond(200, dummyStates);
	    $httpBackend.whenGET('/gtd/context').respond(200, []);
	    $httpBackend.whenGET('/gtd/scope').respond(200, []);
	    // $httpBackend.whenGET(/\/gtd\/nodes?[^t]?.*/).respond(201, []);
	    $httpBackend.whenGET('/gtd/nodes?todo_state=2').respond(201, []);
	    $httpBackend.whenGET(/\/gtd\/nodes\?todo_state=2&upcoming=[-0-9]+/)
		.respond(201, []);
	    $httpBackend.whenGET(/\/gtd\/nodes\?field_group=actions_list&scheduled_date__lte=[-0-9]+&todo_state=8/)
	    	.respond(201, []);
	    $scope = $rootScope.$new();
	    $controller('nextActionsList', {$scope: $scope});
	    $httpBackend.flush();
	    $scope.actionsList = [
		{id: 1,
		 scope: [1],
		 todo_state: 2},
		{id: 2,
		 scope: []},
	    ];
	    $scope.upcomingList = [
		{id: 2,
		 scope: [1]},
		{id: 3,
		 scope: []},
	    ];
	}));
	// Reset httpBackend calls
	afterEach(function() {
	    $httpBackend.verifyNoOutstandingExpectation();
	});
	it('sets the visibleHeadings list upon initialization', function() {
	    $scope.$digest();
	    expect($scope.visibleHeadings.length).toEqual(3);
	});
	describe('the toggleTodoState() method', function() {
	    it('adds the todo-state if it\'s not active', function() {
		$scope.cachedStates = [2, 1]; // To avoid $http call
		expect($scope.activeStates).toEqual([2]);
		$scope.toggleTodoState({id: 1});
		expect($scope.activeStates).toEqual([2, 1]);
	    });
	    it('removes a todo-state if it\'s already active', function() {
		$scope.activeStates = [2, 1];
		$scope.toggleTodoState({id: 1});
		expect($scope.activeStates).toEqual([2]);
	    });
	    it('fetches extra nodes for newly checked todo states', function() {
	    	$httpBackend.expectGET('/gtd/nodes?todo_state=1')
	    	    .respond(201, '');
	    	$scope.toggleTodoState({id: 1});
	    	expect($scope.activeStates).toEqual([2, 1]);
		$httpBackend.flush();
	    	expect($scope.cachedStates).toEqual([2, 1]);
	    	$scope.$digest();
	    	// Make sure it doesn't add twice
	    	$scope.toggleTodoState({id: 1});
	    	expect($scope.cachedStates).toEqual([2, 1]);
	    });

	});
    });
    describe('the nodeOutline controller', function() {
	var $scope;
	beforeEach(inject(function($rootScope, $controller, _$httpBackend_) {
	    // $httpBackend = _$httpBackend_
	    // $httpBackend.whenGET('/gtd/todostate').respond(201, dummyStates);
	    // $httpBackend.whenGET('/gtd/context').respond(201, []);
	    // $httpBackend.whenGET('/gtd/scope').respond(201, []);
	    // // $httpBackend.whenGET(/\/gtd\/nodes?[^t]?.*/).respond(201, []);
	    // $httpBackend.whenGET('/gtd/nodes?todo_state=2').respond(201, []);
	    // $httpBackend.whenGET(/\/gtd\/nodes\?todo_state=2&upcoming=[-0-9]+/)
	    // 	.respond(201, []);
	    // $httpBackend.whenGET(/\/gtd\/nodes\?field_group=actions_list&scheduled_date__lte=[-0-9]+&todo_state=8/)
	    // 	.respond(201, []);
	    $scope = $rootScope.$new();
	    $controller('nodeOutline', {$scope: $scope});
	    // $httpBackend.flush();
	    // $scope.actionsList = [
	    // 	{id: 1,
	    // 	 scope: [1],
	    // 	 todo_state: 2},
	    // 	{id: 2,
	    // 	 scope: []},
	    // ];
	    // $scope.upcomingList = [
	    // 	{id: 2,
	    // 	 scope: [1]},
	    // 	{id: 3,
	    // 	 scope: []},
	    // ];
	}));
	// Reset httpBackend calls
	afterEach(function() {
	    // $httpBackend.verifyNoOutstandingExpectation();
	});
	it('handles the "scope-changed" signal', function() {
	    expect($scope.activeScope).toBe(null);
	    newScope = {id: 1};
	    $scope.$emit('scope-changed', newScope);
	    expect($scope.activeScope).toBe(newScope);
	});
    });
}); // End of gtd-main.js tests

describe('site wide resources', function() {
    var headings, result;
    beforeEach(module('owMain'));

    describe('Array.order_by method', function() {
	beforeEach(function() {
	    headings = [
		{id: 2},
		{id: 3},
		{id: 1},
	    ];
	});
	it('orders an array in ascending order', function() {
	    result = headings.order_by('id');
	    expect(result[0].id).toBe(1);
	});
	it('orders an array in descending order', function() {
	    result = headings.order_by('-id');
	    expect(result[0].id).toBe(3);
	});
    });
});
