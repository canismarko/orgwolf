"use strict";

import "angular";
import "angular-mocks";

describe('the owInbox controller', function() {
    var $scope, $httpBackend, dummyMessages, $templateCache;
    beforeEach(angular.mock.module("orgwolf.wolfmail", "orgwolf"));
    beforeEach(inject(function($rootScope, $controller, _$httpBackend_, _$templateCache_) {
	$scope = $rootScope.$new();
	$controller('owInbox', {$scope: $scope});
	$httpBackend = _$httpBackend_;
	$templateCache = _$templateCache_;
    }));
    beforeEach(function() {
	dummyMessages = [{id: 1}];
	$httpBackend.whenGET(/\/wolfmail\/message\?.*/).respond(200, dummyMessages);
	$httpBackend.whenGET(/\/gtd\/nodes.*/).respond(200, []);
	$templateCache.put('/static/project-outline.html', '');
    });
    it('removes the message in response to  "message-archived" signal', function() {
	$scope.$emit('message-archived', {id: 1});
	$scope.$digest();
	$httpBackend.flush();
	$scope.$emit('message-archived', {id: 1});
	expect($scope.messages.length).toEqual(0);
    });
    it('removes the message if response doesn\'t have in_inbox=true', function() {
	$scope.$digest();
	$httpBackend.flush();
	$scope.$emit('heading-created', {id: 1, in_inbox: false});
	expect($scope.messages.length).toEqual(0);
    });
});
