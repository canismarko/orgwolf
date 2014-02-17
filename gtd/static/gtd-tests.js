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
    describe('the "is_target" filter', function () {
	var is_targetFilter;
	beforeEach(module('owFilters'))
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

    describe('the "style" filter', function() {
	var styleFilter;
	beforeEach(module('owFilters'));
	beforeEach(inject(function(_styleFilter_) {
	    styleFilter = _styleFilter_;
	}));
	it('translates the todo_state\'s color', function() {
	    colorlessState = {
		model: 'gtd.todostate',
		fields: {
		    _color_rgb: 0,
		    _color_alpha: 0,
		}
	    };
    	    expect(styleFilter(colorlessState)).toEqual('color: rgba(0, 0, 0, 0); ');
	    redState = {
		model: 'gtd.todostate',
		fields: {
		    _color_rgb: 13369344,
		    _color_alpha: 0.5,
		}
	    }
    	    expect(styleFilter(redState)).toEqual('color: rgba(204, 0, 0, 0.5); ');
	});
	it('makes actionable todo states bold', function() {
	    actionableState = {
		model: 'gtd.todostate',
		fields: {
		    _color_rgb: 0,
		    _color_alpha: 0,
		    actionable: true,
		}
	    }
	    expect(styleFilter(actionableState)).toMatch(/font-weight: bold;/);
	});
	it('determines heading color based on level', function() {
	    lvlOneHeading = {fields: {level: 1}};
	    lvlTwoHeading = {fields: {level: 2}};
	    lvlSevenHeading = {fields: {level: 6}};
	    expect(styleFilter(lvlOneHeading)).toEqual('color: rgb(80, 0, 0); ');
	    expect(styleFilter(lvlTwoHeading)).toEqual('color: rgb(0, 44, 19); ');
	    expect(styleFilter(lvlSevenHeading)).toEqual('color: rgb(80, 0, 0); ');
	});
    });

    describe('the "order" filter', function() {
    });

    describe('the "root_cell" filter', function() {
    });

    describe('the "deadline_str" filter', function() {
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
	var parentScopes;
	beforeEach(function() {
	    // Mock the templateUrl lookup
	    $templateCache.put('/static/editable.html',
			       '<div class="editable"></div>');
	    // Prepare the DOM element
	    element = $compile(
		'<div ow-editable ow-heading="heading"></div>'
	    )($rootScope);
	    // Fake heading for processing the directive
	    parentScopes = [1, 2];
	    $rootScope.heading = {
		pk: 0,
		get_parent: function() {
		    // Mocked method that returns a fake parent heading
		    return {
			fields: {
			    scope: parentScopes,
			},
		    };
		},
	    };
	});

	it('inherits the parent $rootScope.scopes attribute', function() {
	    var dummyScopes = [{pk: 1, title: 'scp 1'},
			       {pk: 2, title: 'scp 2'}];
	    $rootScope.scopes = dummyScopes;
	    $rootScope.$digest();
	    expect(element.isolateScope().scopes).toEqual(dummyScopes);

	});

	it('should inherit parent\'s "scopes" field if creating a new node', function() {
	    $rootScope.$digest();
	    expect(element.isolateScope().fields.scope).toEqual(parentScopes);
	});

	it('hits the API if node\'s pk is greater than 0', function() {
	    $rootScope.heading.pk = 1;
	    // Define the expected http expectation
	    $httpBackend.expectGET('/gtd/node/1').respond(201, '');
	    $rootScope.$digest();
	});
    });

    describe('the owScopeTabs directive', function() {
    });

    describe('the owTodo directive', function() {
    });

    describe('the owListRow directive', function() {
    });

}); // End of gtd-directives.js tests

describe('owServices in gtd-services.js', function() {
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
}); // End of gtd-services.js tests
