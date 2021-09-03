"use strict";

import "angular";
import "angular-mocks";

describe('the search controller', function() {
    var $scope, $controller, $location, $httpBackend, titleResults, textResults, $templateCache;
    beforeEach(angular.mock.module("orgwolf.gtd"));
    beforeEach(inject(function($rootScope, _$controller_, _$location_,_$httpBackend_, _$templateCache_) {
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
	$templateCache = _$templateCache_;
	$templateCache.put('/static/project-outline.html', '');
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
