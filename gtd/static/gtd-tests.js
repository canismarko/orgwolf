// Jasmine tests for Getting Things Done javascript (mostly angular)
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
		_color_rgb: 0,
		_color_alpha: 0,
	    };
    	    expect(todoStateStyleFilter(colorlessState)).toEqual('color: rgba(0, 0, 0, 0); ');
	    redState = {
		_color_rgb: 13369344,
		_color_alpha: 0.5,
	    };
    	    expect(todoStateStyleFilter(redState)).toEqual('color: rgba(204, 0, 0, 0.5); ');
	});
	it('makes actionable todo states bold', function() {
	    actionableState = {
		_color_rgb: 0,
		_color_alpha: 0,
		actionable: true,
	    };
	    expect(todoStateStyleFilter(actionableState)).toMatch(/font-weight: bold;/);
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

    describe('the "deadline_str" filter', function() {
	var deadline_strFilter, today, heading, due_date;
	beforeEach(inject(function(_deadline_strFilter_) {
	    deadline_strFilter = _deadline_strFilter_;
	    today = new Date();
	    due_date = new Date();
	}));
	it('returns "" for a heading without a due date', function() {
	    heading = {fields: {deadline_date: null}};
	    expect(deadline_strFilter(heading)).toEqual('');
	});
	it('describes a heading due in the future', function() {
	    due_date.setDate(due_date.getDate() + 2);
	    due_date = due_date.toISOString().slice(0, 10);
	    heading = {fields: {deadline_date: due_date}};
	    expect(deadline_strFilter(heading)).toEqual('Due in 2 days');
	});
	it('describes a heading due in the past', function() {
	    due_date.setDate(due_date.getDate() - 2);
	    due_date = due_date.toISOString().slice(0, 10);
	    heading = {fields: {deadline_date: due_date}};
	    expect(deadline_strFilter(heading)).toEqual('Due 2 days ago');
	});
	it('identifies a heading due today', function() {
	    due_date = today.toISOString().slice(0, 10);
	    heading = {fields: {deadline_date: due_date}};
	    expect(deadline_strFilter(heading)).toEqual('Due today');
	});
	it('identifies a heading due tomorrow', function() {
	    due_date.setDate(due_date.getDate() + 1);
	    due_date = due_date.toISOString().slice(0, 10);
	    heading = {fields: {deadline_date: due_date}};
	    expect(deadline_strFilter(heading)).toEqual('Due tomorrow');
	});
	it('identifies a heading due yesterday', function() {
	    due_date.setDate(due_date.getDate() - 1);
	    due_date = due_date.toISOString().slice(0, 10);
	    heading = {fields: {deadline_date: due_date}};
	    expect(deadline_strFilter(heading)).toEqual('Due yesterday');
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
    var $compile, $rootScope, $httpBackend, $templateCache, element;
    beforeEach(module('owDirectives'));
    beforeEach(inject(function($injector) {
	$compile = $injector.get('$compile');
	$rootScope = $injector.get('$rootScope');
	$httpBackend = $injector.get('$httpBackend');
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
		$httpBackend.expect('GET', '/gtd/node/2').respond(201, fullNode);
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

	    it('inherites the parent $rootScope.todo_states attribute', function() {
		var todo_states = [{pk: 1, title: 'state 1'},
				   {pk: 2, title: 'state 2'}];
		$rootScope.todo_states = todo_states;
		$rootScope.$digest();
		expect(element.isolateScope().todo_states).toEqual(todo_states);
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
    });

    describe('the owTodo directive', function() {
    });

    describe('the owListRow directive', function() {
    });

    describe('the owTwisty directive', function() {
	beforeEach(function() {
	    $rootScope.heading = {
		id: 1,
		lft: 1,
		rght: 2,
		tag_string: ''
	    }
	    $templateCache.put('/static/outline-twisty.html',
			       '<div class="ow-hoverable"></div>');
	    // Prepare the DOM element
	    element = $compile(
		'<div ow-twisty ow-heading="heading"></div>'
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
	    $httpBackend.expect('GET', '/gtd/node?parent_id=1')
		.respond(201, children);
	    $rootScope.$digest();
	    element.isolateScope().toggleHeading();
	    $httpBackend.flush();
	    $rootScope.$digest();
	    expect(JSON.stringify(element.isolateScope().children))
		.toEqual(JSON.stringify(children));
	    expect(element.isolateScope().loadedChildren).toBe(true);
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
	    // Mock the global todo_states
	    $rootScope = $injector.get('$rootScope');
	    $httpBackend = $injector.get('$httpBackend');
	    $rootScope.todoStates = [
		{
		    id: 1,
		},
		{
		    id: 2,
		}
	    ];
	    // Create a mocked Heading object
	    $httpBackend.when('GET', '/gtd/node/1')
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
	    $httpBackend.expect('PUT', '/gtd/node/1')
		.respond(201, {});
	    heading.$update();
	    $httpBackend.flush();
	});

	it('uses the POST method to update', function() {
	    $httpBackend.expect('POST', '/gtd/node')
		.respond(201, {});
	    Heading.create({title: 'hello'});
	    $httpBackend.flush();
	});
    });
}); // End of gtd-services.js tests
