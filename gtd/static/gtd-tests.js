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

}); // End of gtd-directives.js tests

describe('services in gtd-services.js', function() {
    beforeEach(angular.mock.module('owServices'));
}); // End of gtd-services.js tests

describe('controllers in gtd-main.js', function() {
    var dummyStates;
    beforeEach(angular.mock.module('owMain'));
    beforeEach(function() {
    beforeEach(inject(function($httpBackend) {
	$httpBackend.whenGET(/\/gtd\/(context|focusareas)/).respond(200, []);
	$httpBackend.whenGET(/\/static\/actions-list.html/)
	    .respond(200, '');
	$httpBackend.whenGET(/\/static\/project-outline.html/)
	    .respond(200, '');
    }));

}); // End of gtd-main.js tests

