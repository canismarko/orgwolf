import 'angular';
import 'angular-mocks';


describe('directives in wolfmail-directives.js', function() {
    var $compile, element, $rootScope, $httpBackend, $templateCache, Message, $scope;
    beforeEach(angular.mock.module('owDirectives', 'owServices'));

    beforeEach(inject(function($injector) {
	$templateCache = $injector.get('$templateCache');
	$compile = $injector.get('$compile');
	$rootScope = $injector.get('$rootScope');
	$httpBackend = $injector.get('$httpBackend');
	$httpBackend.whenGET('/wolfmail/message/1').respond(200, {id: 1});
	Message = $injector.get('Message');
	$scope = $rootScope.$new();
    }));

    afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
    });
}); // End of wolfmail-directives.js tests

describe('services in wolfmail-services.js', function() {
    var $httpBackend, $rootScope;
    beforeEach(angular.mock.module('owServices'));
    beforeEach(inject(function($injector) {
	$httpBackend = $injector.get('$httpBackend');
	$rootScope = $injector.get('$rootScope');
    }));
    afterEach(function() {
	$httpBackend.verifyNoOutstandingExpectation();
    });


}); // End of wolfmail-services.js test

describe('wolfmail-ctrl.js', function() {
    var $controller, $rootScope, $scope, dummyMessages, $httpBackend;
    beforeEach(angular.mock.module('owMain'));
    beforeEach(inject(function($injector) {
	$controller = $injector.get('$controller');
	$rootScope = $injector.get('$rootScope');
	$scope = $rootScope.$new();
	dummyMessages = [{id: 1}];
	$httpBackend = $injector.get('$httpBackend');
	$httpBackend.whenGET('/gtd/contexts').respond(200, []);
	$httpBackend.whenGET('/gtd/focusareas?is_visible=true').respond(200, []);
	$httpBackend.whenGET(/\/wolfmail\/message\?.*/).respond(200, dummyMessages);
	$httpBackend.whenGET(/\/gtd\/nodes.*/).respond(200, []);
    }));
    beforeEach(inject(function($httpBackend) {
	$httpBackend.whenGET(/\/static\/project-outline.html/)
	    .respond(200, '');
    }));

});
