import "angular";
import "angular-mocks";

// Jasmine tests for Getting Things Done javascript (mostly angular)
var customMatchers = {
    toHaveClass: function(utils) {
	// Checks that element has HTML class ala jQuery().hasClass()
	return {
	    compare: function(element, cls) {
		var result = {};
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
    beforeEach(angular.mock.module('owFilters'))
    describe('the "asHtml" filter', function() {
	var asHtmlFilter;
	beforeEach(inject(function(_asHtmlFilter_) {
    	    asHtmlFilter = _asHtmlFilter_;
	}));
	it('converts markdown to to HTML', function() {
	    var markdown, html;
	    markdown = '# Hello';
	    html = asHtmlFilter(markdown);
	    expect(html.toString()).toEqual('<h1 id="hello">Hello</h1>');
	});
    });
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
	    var lvlOneHeading = {level: 1};
	    var lvlTwoHeading = {level: 2};
	    var lvlSixHeading = {level: 6};
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
	    var colorlessState = {
		color: {
		    red: 0,
		    green: 0,
		    blue: 0,
		    alpha: 0
		}
	    };
    	    expect(todoStateStyleFilter(colorlessState)).toEqual('color: rgba(0, 0, 0, 0); ');
	    var redState = {
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

    describe('the sortActions filter', function() {
	var listFilter, activeState, $httpBackend;
	beforeEach(inject(function($injector) {
	    listFilter = $injector.get('sortActionsFilter');
	    activeState = $injector.get('activeState');
	    $httpBackend = $injector.get('$httpBackend');
	    $httpBackend.whenGET('/gtd/locations').respond(200, [
		{id: 1,
		 tag_string: 'home'},
		{id: 2,
		 tag_string: 'work'},
	    ]);
	    $httpBackend.flush();
	}));
	afterEach(function() {
	    $httpBackend.verifyNoOutstandingExpectation();
	});
	it('puts nodes with an upcoming deadline at the top', function() {
	    var d = new Date();
	    // Set new future date within seven days
	    // (slicing ensures leading zeroes)
	    d.setDate(d.getDate() + 5);
	    var futrYear = d.getFullYear();
	    var futrMonth = ("0" + (d.getMonth() + 1)).slice (-2);
	    var futrDay = ("0" + d.getDate()).slice(-2);
	    var future_str = futrYear + '-' + futrMonth + '-' + futrDay;
	    var unsorted_data = [{'deadline_date': null},
			     {'deadline_date': future_str}];
	    var sorted_data = [{'deadline_date': future_str},
			   {'deadline_date': null}];
	    expect(listFilter(unsorted_data)).toEqual(sorted_data);
	});
	it('puts nodes with higher priority at the top', function() {
	    var unsorted_data = [{'priority': 'C'},
			     {'priority': 'B'},
			     {'priority': 'A'}];
	    var sorted_data = [{'priority': 'A'},
			   {'priority': 'B'},
			   {'priority': 'C'}];
	    expect(listFilter(unsorted_data)).toEqual(sorted_data);
	});
	it('puts location-specific tasks at the top', function() {
	    var unsortedList, sortedList, homeHeading, otherHeading;
	    activeState.context = {'locations_available': [1, 2]};
	    homeHeading = {'tag_string': ':home:'};
	    otherHeading = {'tag_string': ''};
	    unsortedList = [otherHeading, homeHeading];
	    sortedList = [homeHeading, otherHeading];
	    expect(listFilter(unsortedList)).toEqual(sortedList);
	})
    });

    describe('the "order" filter', function() {
	var orderFilter;
	beforeEach(inject(function(_orderFilter_) {
	    orderFilter = _orderFilter_;
	}));
	it('sorts by criterion', function() {
	    var unsorted_data = [{'key': 'bravo'}, {'key': 'alpha'},
			     {'key': 'delta'}, {'key': 'charlie'}];
	    var sorted_data = [{'key': 'alpha'}, {'key': 'bravo'},
			     {'key': 'charlie'}, {'key': 'delta'}];
	    expect(orderFilter(unsorted_data, 'key')).toEqual(sorted_data);
	});
	it('puts relatives of activeHeading to the top', function() {
	    var unsorted = [{title: 'last', tree_id: 1},
			{title: 'first', tree_id: 2}];
	    var sorted = orderFilter(unsorted, 'none', {tree_id: 2});
	    expect(sorted[0].title).toEqual('first');
	})
    });

    describe('the "currentList" filter', function() {
	var currentListFilter, headings;
	beforeEach(inject(function(_currentListFilter_) {
	    currentListFilter = _currentListFilter_;
	    headings = [
		{id: 1,
		 todo_state: 1,
		 focus_areas: [1]},
		{id: 2,
		 todo_state: 2,
		 focus_areas: []},
	    ];
	}));
	it('passes the array back if no parameters given', function() {
	    var result = currentListFilter(headings);
	    expect(result).toBe(headings);
	});
	it('filters by active todoState', function() {
	    var result = currentListFilter(headings, [1]);
	    expect(result.length).toEqual(1);
	    expect(result[0]).toBe(headings[0]);
	});
	it('filters out headings that are also on the upcoming list', function() {
	    var upcomingList = [
		{id: 2},
		{id: 3},
	    ];
	    headings[1].deadline_date = '2014-03-08';
	    var result = currentListFilter(headings, [1, 2], upcomingList);
	    expect(result.length).toEqual(1);
	    expect(result[0]).toBe(headings[0]);
	});
	it('filters by activeParent', function() {
	    headings = [
		{id: 1, tree_id: 1, lft: 2, rght: 5},
		{id: 2, tree_id: 2, lft: 1, rght: 2},
		{id: 3, tree_id: 1, lft: 6, rght: 7},
		{id: 4, tree_id: 1, lft: 3, rght: 4},
	    ];
	    var activeParent = headings[0]
	    var result = currentListFilter(headings, null, [], activeParent);
	    expect(result.length).toEqual(2);
	    expect(result[0].id).toEqual(1);
	    expect(result[1].id).toEqual(4);
	});
    });

    describe('the "deadline_str" filter', function() {
	var deadline_strFilter, today, heading, due_date;
	beforeEach(inject(function(_deadline_strFilter_) {
	    deadline_strFilter = _deadline_strFilter_;
	    today = new Date(2014, 2, 21, 18, 1, 1);
	    due_date = new Date(2014, 2, 21, 18, 1, 1);
	}));
	it('returns "" for a heading without a due date', function() {
	    heading = {deadline_date: null};
	    expect(deadline_strFilter(heading.deadline_date)).toEqual('');
	});
	it('describes a heading due in the future', function() {
	    due_date.setDate(due_date.getDate() + 2);
	    due_date = due_date.toISOString().slice(0, 10);
	    heading = {deadline_date: due_date};
	    expect(deadline_strFilter(heading.deadline_date, today))
		.toEqual('Due in 2 days');
	});
	it('describes a heading due in the past', function() {
	    due_date.setDate(due_date.getDate() - 2);
	    due_date = due_date.toISOString().slice(0, 10);
	    heading = {deadline_date: due_date};
	    expect(deadline_strFilter(heading.deadline_date, today))
		.toEqual('Due 2 days ago');
	});
	it('identifies a heading due today', function() {
	    due_date = today.toISOString().slice(0, 10);
	    heading = {deadline_date: due_date};
	    expect(deadline_strFilter(heading.deadline_date, today)).toEqual('Due today');
	});
	it('identifies a heading due tomorrow', function() {
	    due_date.setDate(due_date.getDate() + 1);
	    due_date = due_date.toISOString().slice(0, 10);
	    heading = {deadline_date: due_date};
	    expect(deadline_strFilter(heading.deadline_date, today)).toEqual('Due tomorrow');
	});
	it('identifies a heading due yesterday', function() {
	    due_date.setDate(due_date.getDate() - 1);
	    due_date = due_date.toISOString().slice(0, 10);
	    heading = {deadline_date: due_date};
	    expect(deadline_strFilter(heading.deadline_date, today)).toEqual('Due yesterday');
	});
    });

    describe('the duration filter', function() {
	var durationFilter, node;
	beforeEach(inject(function(_durationFilter_) {
	    durationFilter = _durationFilter_;
	}));
	it('handles day-specific nodes', function() {
	    node = {
		scheduled_date: "2014-06-16",
		end_date: "2014-06-18"
	    }
	    expect(durationFilter(node)).toEqual("2 days");
	});
	it('handles time-specific nodes', function() {
	    node = {
		scheduled_date: "2014-06-16",
		scheduled_time: "17:15",
		end_date: "2014-06-16",
		end_time: "18:00",
	    }
	    expect(durationFilter(node)).toEqual("45 minutes");
	});
	it('handles complex time intervals', function() {
	    node = {
		scheduled_date: "2014-06-16",
		scheduled_time: "17:15",
		end_date: "2014-06-18",
		end_time: "19:00",
	    }
	    expect(durationFilter(node)).toEqual("2 days, 1 hour, 45 minutes");
	});
    });

    describe('the currentFocusArea filter', function() {
	var dummyHeadings, focusAreaFilter;
	beforeEach(inject(function(_currentFocusAreaFilter_) {
	    focusAreaFilter = _currentFocusAreaFilter_;
	    dummyHeadings = [
		{id: 1,
		 focus_areas: [1, 2]},
		{id: 2,
		 focus_areas: [1]},
		{id: 3,
		 focus_areas: []},
		{id: 4,
		 focus_areas: [6]}
	    ];
	}));

	it('filters headings based on active focus area', function() {
	    var filteredList = focusAreaFilter(dummyHeadings, {id: 2});
	    expect(filteredList.length).toBe(1);
	    expect(JSON.stringify(filteredList[0]))
		.toEqual(JSON.stringify( dummyHeadings[0] ));
	});

	it('allows all headings if no active focus area', function() {
	    var filteredList = focusAreaFilter(dummyHeadings, {id: 0});
	    expect(filteredList).toEqual(dummyHeadings);
	});

	it('identifies nodes with no focus area', function() {
	    var headings = [{id: 1, focus_areas: []},
			    {id: 2, focus_areas: [1]}];
	    var filteredList = focusAreaFilter(headings, {id: -1});
	    expect(filteredList.length).toEqual(1);
	    expect(filteredList[0].id).toEqual(1);
	});
    });

    describe('the listFocusAreas filter', function() {
	var listFocusAreasFilter, $httpBackend;
	beforeEach(inject(function($injector) {
	    listFocusAreasFilter = $injector.get('listFocusAreasFilter');
	    $httpBackend = $injector.get('$httpBackend');
	    $httpBackend.whenGET('/gtd/focusareas?is_visible=true')
		.respond(200, [
		    {id: 1,
		     display: 'Work'},
		    {id: 2,
		     display: 'Home'},
		    {id: 3,
		     display: 'Health'},
		]);
	    $httpBackend.flush();
	}));
	it('processes a heading with one focus area', function() {
	    var heading = {focus_areas: [1]};
	    expect(listFocusAreasFilter(heading)).toEqual('Work');
	});
	it('processes a heading with two focus areas', function() {
	    var heading = {focus_areas: [1, 2]};
	    expect(listFocusAreasFilter(heading)).toEqual('Work and Home');
	});
	it('processes a heading with three focus areas', function() {
	    var heading = {focus_areas: [1, 2, 3]};
	    expect(listFocusAreasFilter(heading))
		.toEqual('Work, Home and Health');
	});
    });

    describe('the highlightSearch filter', function() {
	var filter;
	beforeEach(inject(function($injector) {
	    filter = $injector.get("highlightSearchFilter");
	}));
	it('wraps a search query in a span element', function() {
	    var filteredTitle, expectedText;
	    filteredTitle = filter("a very nice day", 'very');
	    expect(filteredTitle).toEqual(
		'a <span class="highlight">very</span> nice day');
	})
    });
    describe('the highlightSearchText filter', function() {
	var filter;
	beforeEach(inject(function($injector) {
	    filter = $injector.get("highlightSearchTextFilter");
	}));
	it('returns an empty string if no match was found', function() {
	    var filteredText = filter("a very nice day", 'never');
	    expect(filteredText).toEqual('');
	});
	it('returns 40 characters before the first match', function() {
	    var filteredText = filter(
		"it's a wonderful day in the neighbourhood and we can jam",
		'and');
	    expect(filteredText).toEqual(
		"&hellip;'s a wonderful day in the neighbourhood and we can jam"
	    );
	});
	it('truncates long text', function() {
	    var dummyText;
	    // Repeat this text a few times to get a long string
	    dummyText = "Wishes are funny things. Unless you're a ghost. ";
	    dummyText += dummyText + dummyText + dummyText;
	    dummyText += dummyText + dummyText + dummyText;
	    dummyText += dummyText + dummyText + dummyText;
	    var filteredText = filter(
		dummyText,
		'wishes');
	    expect(filteredText.length).toEqual(508);
	    expect(filteredText.slice(-8)).toEqual('&hellip;');
	});
	it('appends the number of matches at the end');
    });
});

describe('directives in gtd-directives.js', function() {
    var $compile, $rootScope, $httpBackend, $templateCache, element, dummyStates;
    beforeEach(angular.mock.module('owDirectives', 'owFilters', 'owServices'));
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
	$httpBackend.whenGET('/gtd/todostates').respond(201, dummyStates);
	$httpBackend.whenGET('/gtd/focusareas?is_visible=true').respond(200, [
	    {id: 1, display: 'Work'},
	    {id: 2, display: 'Home'}
	]);
	$templateCache = $injector.get('$templateCache');
    }));
    // Reset httpBackend calls
    afterEach(function() {
	$httpBackend.verifyNoOutstandingExpectation();
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
		focus_areas: [1, 2]
    	    };
	    $httpBackend.whenGET('/gtd/nodes/2?').respond(200, heading);
	    $httpBackend.whenGET('/gtd/focusareas?is_visible=true').respond(200, [
		{id: 1, display: 'Work'},
		{id: 2, display: 'Home'}
	    ]);
	    $rootScope.heading = Heading.get({id: 2});
	    $httpBackend.flush();
    	    element = $compile(
    		'<div ow-details ow-heading="heading"></div>'
    	    )($rootScope);
	    $httpBackend.flush();
    	}));
    });

    describe('the owEditable directive', function() {
	var fullNode;
	beforeEach(function() {
	    // Mock the templateUrl lookup
	    $templateCache.put('/static/editable.html',
			       '<div class="editable"></div>');
	});

	describe('when a new node is being created ([ow-parent])', function() {
	    var parentScope, parentFocusAreas;
	    beforeEach(function() {
		element = $compile(
		    '<div ow-editable ow-parent="heading"></div>'
		)($rootScope);
		parentFocusAreas = [1, 2];
		$rootScope.heading = {
		    id: 1,
		    title: 'Root-level node 1',
		    focus_areas: parentFocusAreas,
		    priority: 'A'
		};
	    });
	    it('inherits parent\'s fields if creating a new node (priority and focus areas)', function() {
		$rootScope.$digest();
		expect(element.isolateScope().fields.focus_areas).toEqual(parentFocusAreas);
		expect(element.isolateScope().fields.priority).toEqual('A');
	    });
	});

	describe('when a new root-level node is being created (no attrs)', function() {
	    beforeEach(function() {
		element = $compile('<div ow-editable></div>')($rootScope);
	    });
	    it('creates a new root-level node', function() {
		// Simulate the $scope that is return from get_parent() for a top-level node
		$rootScope.$digest();
		expect(element.isolateScope().fields.focus_areas).toEqual([]);
		expect(element.isolateScope().fields.priority).toEqual('C');
	    });

	    it('adds the ow-editable class (for animations)', function() {
		$rootScope.$digest();
		expect(element).toHaveClass('ow-editable');
	    });
	});
    });

    describe('the owFocusAreaTabs directive', function() {
	var $childScope;
	beforeEach(function() {
	    $templateCache.put(
		'/static/focus-area-tabs.html',
		'<ul><li id="fa-tab-{{ fa.id }}" ng-repeat="fa in focusAreas"></li></ul>'
	    );
	    element = $compile(
		'<div ow-focus-area-tabs></div>'
	    )($rootScope);
	});
	it('emits the "change-focus-area" event on changeFocusArea()', function() {
	    var emittedStatus, targetFocusArea, emittedFocusArea;
	    $rootScope.$digest();
	    $childScope = element.isolateScope();
	    expect($childScope).toBeDefined();
	    targetFocusArea = {id: 1};
	    $rootScope.$on('focus-area-changed', function(e, newFocusArea) {
		emittedStatus = true;
		emittedFocusArea = newFocusArea;
	    });
	    $childScope.changeFocusArea(targetFocusArea);
	    expect(emittedStatus).toBeTruthy();
	    expect(emittedFocusArea).toBe(targetFocusArea);
	});
	it('sets scope.activeFocusArea on changeFocusArea()', function() {
	    var newFocusArea;
	    newFocusArea = {id: 1};
	    $rootScope.$digest();
	    $childScope = element.isolateScope();
	    $childScope.changeFocusArea(newFocusArea);
	    expect($childScope.activeFocusArea).toBe(newFocusArea);
	});
	it('moves the "active" class to a tab on changeFocusArea()', function() {
	    var newFocusArea = {id: 1};
	    $httpBackend.flush();
	    $rootScope.$digest();
	    // Set the first focus area
	    $childScope = element.isolateScope();
	    $childScope.changeFocusArea(newFocusArea);
	    expect(element.find('#fa-tab-1')).toHaveClass('active');
	    expect(element.find('#fa-tab-2')).not.toHaveClass('active');
	    // Now change the focus area
	    newFocusArea = {id: 2};
	    $childScope.changeFocusArea(newFocusArea)
	    expect(element.find('#fa-tab-2')).toHaveClass('active');
	    expect(element.find('#fa-tab-1')).not.toHaveClass('active');
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

	it('updates models when todoStateId changes', function() {
	    var scope, expectedState;
	    $rootScope.heading.$update = function() {
		return {
		    then: function() {
			return {
			    'catch': function() {}
			};
		    }
		};
	    };
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

	it('responds when a node has just been closed', function() {
	    var parentScope, childScope;
	    $rootScope.$digest();
	    parentScope = element.isolateScope();
	    childScope = parentScope.$new();
	    childScope.$emit('finishEdit', {}, true);
	    expect(parentScope.completed).toBeTruthy();
	    childScope.$emit('finishEdit', {}, false);
	    expect(parentScope.completed).toBeFalsy();
	});
    });

    describe('the owTwisty directive', function() {
	beforeEach(function() {
	    $rootScope.heading = {
		id: 1,
		lft: 1,
		rght: 2,
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
	    it('identifies a leaf node', function() {
		$rootScope.$digest();
		var scope = element.isolateScope();
		expect(element.find('.ow-hoverable')).toHaveClass('leaf-node');
		expect(scope.isLeafNode).toBeTruthy();
	    });
	    it('identifies a non-leaf node', function() {
		$rootScope.$digest();
		expect(element.find('.ow-hoverable')).toHaveClass('leaf-node');
		$rootScope.heading.rght = 4;
		$rootScope.$digest();
		var scope = element.isolateScope();
		expect(element.find('.ow-hoverable')).not.toHaveClass('leaf-node');
		expect(scope.isLeafNode).toBeFalsy();
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
	    var $scope = $rootScope.$new();
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
	    var scope = element.isolateScope();
	    expect(typeof scope.getChildren).toEqual('function');
	});
	it('responds to the open-descendants signal', function() {
	    $httpBackend.expectGET('/gtd/nodes?field_group=outline&parent_id=1').respond(200, []);
	    $rootScope.$digest();
	    var $scope = element.isolateScope();
	    expect($scope.state).toBe(0);
	    $rootScope.$broadcast('open-descendants');
	    expect($scope.state).toBe(1);
	});
	it('cycles through all states when toggled', function() {
	    $httpBackend.expectGET('/gtd/nodes?field_group=outline&parent_id=1').respond(200, []);
	    $rootScope.heading.rght = 4;
	    $rootScope.$digest();
	    var scope = element.isolateScope();
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
	it('skips state 2 if heading is a leaf node', function() {
	    $httpBackend.expectGET('/gtd/nodes?field_group=outline&parent_id=1').respond(200, []);
	    $rootScope.$digest();
	    var scope = element.isolateScope();
	    expect(scope.state).toEqual(0);
	    scope.toggleHeading({target: element});
	    $httpBackend.flush();
	    expect(scope.state).toEqual(2);
	    scope.toggleHeading({target: element});
	    expect(scope.state).toEqual(0);
	});
	it('broadcasts open-descendants on state 2', function() {
	    $httpBackend.expectGET('/gtd/nodes?field_group=outline&parent_id=1').respond(200, []);
	    $rootScope.$digest();
	    var scope = element.isolateScope();
	    var childScope = scope.$new();
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
	    var scope = element.isolateScope();
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
    beforeEach(angular.mock.module('owServices'));
    describe('the owWaitIndicator service', function() {
	var waiting, $rootScope, waitIndicator;
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
	    expect(true).toBeTruthy();
	});

	it('uses the POST method to update', function() {
	    $httpBackend.expect('POST', '/gtd/nodes')
		.respond(201, {});
	    Heading.create({title: 'hello'});
	    $httpBackend.flush();
	    expect(true).toBeTruthy();
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
	    $httpBackend.whenGET('/gtd/todostates').respond(201, mockedStates);
	}));
	it('sets the getState() method', function() {
	    $httpBackend.flush();
	    expect(todoStates.getState(1).id).toEqual(1);
	});
    });

    describe('the activeHeading.activate() method', function() {
	var $httpBackend, activeHeading;
	beforeEach(inject(function($injector) {
	    $httpBackend = $injector.get('$httpBackend');
	    activeHeading = $injector.get('activeHeading');
	}));
	afterEach(function() {
	    $httpBackend.verifyNoOutstandingExpectation();
	});
	it('retrieves the heading from the server', function() {
	    activeHeading.activate(1);
	    $httpBackend.expectGET('/gtd/nodes/1').respond(200, {
		id: 1,
		tree_id: 1,
	    });
	    $httpBackend.flush();
	    expect(activeHeading.id).toEqual(1);
	});
	it("resets the object if an empty string is supplied", function() {
	    activeHeading.obj = 'Not reset'; // To test for proper resetting
	    activeHeading.activate('');
	    expect(activeHeading.obj).toBe(null);
	    expect(activeHeading.id).toBe(0);
	});
    });
}); // End of gtd-services.js tests

describe('controllers in gtd-main.js', function() {
    var dummyStates;
    beforeEach(angular.mock.module('owMain'));
    beforeEach(function() {
	dummyStates = [
	    {id: 1},
	    {id: 2},
	]
    });
    beforeEach(inject(function($httpBackend) {
	$httpBackend.whenGET(/\/gtd\/(context|focusareas)/).respond(200, []);
    }));
    describe('nextActionsList controller', function() {
	var $httpBackend, actionsList, upcomingList, $scope;
	beforeEach(inject(function($rootScope, $controller, _$httpBackend_) {
	    $httpBackend = _$httpBackend_
	    actionsList = [
		{id: 1,
		 scope: [1],
		 todo_state: 2},
		{id: 2,
		 scope: []},
	    ];
	    upcomingList = [
		{id: 2,
		 scope: [1]},
		{id: 3,
		 scope: []},
	    ];
	    $httpBackend.whenGET('/gtd/todostates').respond(200, dummyStates);
	    $httpBackend.whenGET('/gtd/focusareas?is_visible=true').respond(200, [
		{id: 1, display: 'Work'},
		{id: 2, display: 'Home'}
	    ]);
	    // $httpBackend.whenGET(/\/gtd\/nodes?[^t]?.*/).respond(201, []);
	    $httpBackend.whenGET(/\/gtd\/nodes\?field_group=actions_list&todo_state=2(&todo_state=1)?/).respond(201, actionsList);
	    $httpBackend.whenGET(/\/gtd\/nodes\?field_group=actions_list&todo_state=2&upcoming=[-0-9]+/)
		.respond(201, upcomingList);
	    $httpBackend.whenGET(/\/gtd\/nodes\?field_group=actions_list&scheduled_date__lte=[-0-9]+&todo_state=8/)
	    	.respond(201, []);
	    $scope = $rootScope.$new();
	    $controller('nextActionsList', {$scope: $scope});
	}));
	// Reset httpBackend calls
	afterEach(function() {
	    $httpBackend.verifyNoOutstandingExpectation();
	});
	it('sets the visibleHeadings list upon initialization', function() {
	    $scope.$digest();
	    $httpBackend.flush();
	    expect($scope.visibleHeadings.length).toEqual(2);
	});
	it('sets an indicator for loading status', function() {
	    expect($scope.$digest());
	    expect($scope.isLoading).toBeTruthy();
	    $httpBackend.flush();
	    expect($scope.isLoading).toBeFalsy();
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
	describe('the changeContext() method', function() {
	    it('updates the cookies with the new context', function() {
		$httpBackend.whenGET('/gtd/nodes?context=0&field_group=actions_list&todo_state=2')
		    .respond(200, {});
		$httpBackend.whenGET(/\/gtd\/nodes\?context=0&field_group=actions_list&todo_state=2&upcoming=[0-9-]+/)
		    .respond(200, {});
		$scope.changeContext()
		expect(true).toBeTruthy();
	    });
	});
	describe('project filtering', function() {
	    beforeEach(function() {
		$httpBackend.expectGET('/gtd/nodes/1')
		    .respond(200, {id: 1});
	    });
	    it('responds to filter-parent signals', function() {
		$scope.$emit('filter-parent', 1);
		expect($scope.parentId).toEqual(1);
	    });
	    it('watches for changes to parentId', function() {
		$scope.parentId = 1;
		$scope.$digest();
		$httpBackend.flush();
		$scope.activeParent.id = 1;
		expect(true).toBeTruthy();
	    });
	});
    });
    describe('the nodeOutline controller', function() {
	var $scope, $controller, $httpBackend, $location;
	beforeEach(inject(function($injector) {
	    var nodesUrl = '/gtd/nodes?archived=false&field_group=outline&parent_id=0';
	    // Set up backend stuffs
	    $httpBackend = $injector.get('$httpBackend');
	    $httpBackend.whenGET(nodesUrl).respond(200, []);
	    $location = $injector.get('$location');
	    $controller = $injector.get('$controller');
	    $scope = $injector.get('$rootScope').$new();
	}));
	// Reset httpBackend calls
	afterEach(function() {
	    $httpBackend.verifyNoOutstandingExpectation();
	});
	it('handles the "focus-area-changed" signal', function() {
	    $controller('nodeOutline', {$scope: $scope});
	    expect($scope.activeFocusArea).toBe(undefined);
	    var newFocusArea = {id: 1};
	    $scope.$emit('focus-area-changed', newFocusArea);
	    expect($scope.activeFocusArea).toBe(newFocusArea);
	});
	it('activates the activeNode if given in location string', function() {
	    $location.hash('1-test-title');
	    $httpBackend.expectGET('/gtd/nodes/1')
		.respond(200, {
		    id: 1,
		    tree_id: 1
		});
	    $controller('nodeOutline', {$scope: $scope});
	    $httpBackend.flush();
	    expect(true).toBeTruthy();
	});
    });

    describe('the search controller', function() {
	var $scope, $controller, $location, $httpBackend, titleResults, textResults;
	beforeEach(inject(function($rootScope, _$controller_, _$location_,_$httpBackend_) {
	    // Fake response data
	    titleResults = [
		{id: 1, title: "hello, world"}
	    ];
	    textResults = [
		{id: 2, text: "hello m'darling"}
	    ];
	    // Dependency injection and setup
	    $scope = $rootScope.$new();
	    $controller = _$controller_;
	    $location = _$location_;
	    $httpBackend = _$httpBackend_;
	    $httpBackend.whenGET(/\/gtd\/(context|focusareas)/).respond(200, []);
	}));
	afterEach(function() {
	    $httpBackend.verifyNoOutstandingExpectation();
	});
	it('constructs a regex string based on the query', function() {
	    $location.search('q', 'hello+world');
	    $controller('search', {$scope: $scope});
	    $httpBackend.whenGET('/gtd/nodes?title__contains=hello')
		.respond(200, titleResults);
	    $httpBackend.whenGET('/gtd/nodes?text__contains=hello')
		.respond(200, textResults);
	    $httpBackend.whenGET('/gtd/nodes?title__contains=world')
		.respond(200, titleResults);
	    $httpBackend.whenGET('/gtd/nodes?text__contains=world')
		.respond(200, []);
	    expect($scope.reString).toEqual('hello|world');
	});
	it('fetches nodes based on title', function() {
	    // Set up fake query and check for API call
	    $location.search('q', 'hello');
	    $httpBackend.expectGET('/gtd/nodes?title__contains=hello')
		.respond(200, titleResults);
	    $httpBackend.expectGET('/gtd/nodes?text__contains=hello')
		.respond(200, textResults);
	    $controller('search', {$scope: $scope});
	    $httpBackend.flush();
	    // Check for results added to $scope.results
	    expect($scope.results[0].title).toEqual(titleResults[0].title);
	    expect($scope.results[1].text).toEqual(textResults[0].text);
	});
	it('splits multiple words into separate queries', function() {
	    // Set up fake query and check for API call
	    $location.search('q', 'hello+world');
	    $httpBackend.expectGET('/gtd/nodes?title__contains=hello')
		.respond(200, titleResults);
	    $httpBackend.expectGET('/gtd/nodes?text__contains=hello')
		.respond(200, textResults);
	    $httpBackend.expectGET('/gtd/nodes?title__contains=world')
		.respond(200, titleResults);
	    $httpBackend.expectGET('/gtd/nodes?text__contains=world')
		.respond(200, []);
	    $controller('search', {$scope: $scope});
	    $httpBackend.flush();
	    expect(true).toBeTruthy();
	});
	it('removes duplicate entries', function() {
	    $location.search('q', 'hello+world');
	    $httpBackend.whenGET('/gtd/nodes?title__contains=hello')
		.respond(200, titleResults);
	    $httpBackend.whenGET('/gtd/nodes?text__contains=hello')
		.respond(200, textResults);
	    $httpBackend.whenGET('/gtd/nodes?title__contains=world')
		.respond(200, titleResults);
	    $httpBackend.whenGET('/gtd/nodes?text__contains=world')
		.respond(200, []);
	    $controller('search', {$scope: $scope});
	    $httpBackend.flush();
	    expect($scope.results.length)
		.toEqual(titleResults.length + textResults.length);
	});
	it('ignores trivial words');
	it('keeps quotes search string as one query');
    });

    describe('calendar controller', function() {
	var $scope, $httpBackend;
	beforeEach(inject(function($rootScope, $controller, _$httpBackend_) {
	    $scope = $rootScope.$new();
	    $controller('calendar', {$scope: $scope});
	    $httpBackend = _$httpBackend_;
	    $httpBackend.whenGET('/gtd/contexts').respond(200);
	    $httpBackend.whenGET('/gtd/focusareas?is_visible=true').respond(200, [
		{id: 1, display: 'Work'},
		{id: 2, display: 'Home'}
	    ]);
	    $httpBackend.whenGET('/gtd/nodes?archived=false&field_group=calendar&todo_state__abbreviation=HARD').respond(200);
	    $httpBackend.whenGET('/gtd/nodes?archived=false&field_group=calendar&todo_state__abbreviation=DFRD').respond(200);
	    $httpBackend.whenGET('/gtd/nodes?archived=false&deadline_date__gt=1970-01-01&field_group=calendar_deadlines').respond(200);
	}));
	beforeEach(function() {
	    $scope.owCalendar = {fullCalendar: function() {}};
	    $scope.activeCalendars = [1];
	});
	afterEach(function() {
	    $httpBackend.verifyNoOutstandingExpectation();
	});
	it('creates the allCalendars list', function() {
	    expect($scope.allCalendars.length).toBe(3);
	});
	it('toggles a currently active calendar', function() {
	    $scope.toggleCalendar($scope.allCalendars[0]);
	    expect($scope.activeCalendars.length).toEqual(0);
	});
	it('toggles a currently inactive calendar', function() {
	    $scope.toggleCalendar($scope.allCalendars[1]);
	    expect($scope.activeCalendars.length).toEqual(2);
	});
	it('reschedules a day-specific node', function() {
	    var newDate = new Date('2014-06-16T12:00:00.000Z');
	    $httpBackend.expectPUT('/gtd/nodes/1',
				   '{"id":1,"scheduled_date":"2014-6-16"}')
		.respond(200, {});
	    $scope.moveEvent({id: 1,
			      start: newDate,
			      allDay: true,
			     });
	    expect(true).toBeTruthy();
	});
	it('reschedules a time-specific node', function() {
	    var newDate, expectedDate, expectedTime, expectedString;
	    newDate = new Date("2014-06-17T03:17:05.746Z");
	    expectedDate = '' + newDate.getFullYear() + '-' +
		(newDate.getMonth() + 1) + '-' + newDate.getDate();
	    expectedTime = '' + newDate.getHours() + ':' + newDate.getMinutes();
	    expectedString = '{"id":1,"scheduled_date":"' + expectedDate +
		'","scheduled_time":"' + expectedTime + '"}';
	    $httpBackend.expectPUT('/gtd/nodes/1', expectedString)
		.respond(200, {});
	    $scope.moveEvent({id: 1,
			      start: newDate,
			      allDay: false,
			     });
	    expect(true).toBeTruthy();
	});
	it('reschedules a deadline node', function() {
	    var newDate = new Date("2014-06-16T12:00:00.000Z");
	    $httpBackend.expectPUT('/gtd/nodes/1',
				   '{"id":1,"deadline_date":"2014-6-16"}')
		.respond(200, {});
	    $scope.moveEvent({id: 1,
			      start: newDate,
			      allDay: true,
			      field_group: 'calendar_deadlines'});
	    expect(true).toBeTruthy();
	});
	it('resizes a scheduled node with date only', function() {
	    var newDate = new Date("2014-06-16T12:00:00.000Z");
	    $httpBackend.expectPUT('/gtd/nodes/1',
				   '{"id":1,"end_date":"2014-6-16"}')
		.respond(200, {});
	    $scope.resizeEvent({id: 1,
				end: newDate,
				allDay: true,
				field_group: 'calendar'});
	    expect(true).toBeTruthy();
	});
	it('resizes a scheduled node with date and time', function() {
	    var newDate, expectedDate, expectedTime, expectedString;
	    var newDate = new Date("2014-06-16T03:55:59.000Z");
	    // Prepare expected request data string
	    expectedDate = '' + newDate.getFullYear() + '-' +
		(newDate.getMonth() + 1) + '-' + newDate.getDate();
	    expectedTime = '' + newDate.getHours() + ':' + newDate.getMinutes();
	    expectedString = '{"id":1,"end_date":"' + expectedDate +
		'","end_time":"' + expectedTime + '"}';
	    $httpBackend.expectPUT('/gtd/nodes/1', expectedString)
		.respond(200, {});
	    $scope.resizeEvent({id: 1,
				end: newDate,
				allDay: false,
				field_group: 'calendar'});
	    expect(true).toBeTruthy();
	});
	it('doesn\'t resize a deadline node', function() {
	    // This test is valid since no $httpBackend call is expected
	    $scope.resizeEvent({id: 1,
				end: new Date(),
				field_group: 'calendar_deadlines'});
	    expect(true).toBeTruthy();
	});
    });
}); // End of gtd-main.js tests

describe('site wide resources', function() {
    var headings, result;
    beforeEach(angular.mock.module('owMain'));

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
