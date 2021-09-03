"use strict";

import "angular";
import "angular-mocks";

describe('the Message $resource object', function() {
    var Message, $httpBackend, $rootScope, $templateCache;
    beforeEach(angular.mock.module("orgwolf.wolfmail"));
    beforeEach(inject(function($injector) {
	Message = $injector.get('Message');
	$rootScope = $injector.get('$rootScope');
	$httpBackend = $injector.get('$httpBackend');
	$templateCache = $injector.get('$templateCache');
    }));
    beforeEach(inject(function($injector) {
	$templateCache.put('/static/project-outline.html', '');
    }));
    afterEach(function() {
	$httpBackend.verifyNoOutstandingExpectation();
    });
    it('retrieves message list', function() {
	$httpBackend.expectGET('/wolfmail/message').respond(200, []);
	Message.query();
	expect(true).toBeTruthy();
    });
    it('retrieves individual message', function() {
	$httpBackend.expectGET('/wolfmail/message/1').respond(200, {});
	Message.get({id: 1});
	expect(true).toBeTruthy();
    });
    it('archives a retrieved message', function() {
	var emitMessage, $scope, msg;
	$scope = $rootScope.$new();
	$httpBackend.expectGET('/wolfmail/message/1').respond(200, {id: 1});
	msg = Message.get({id: 1});
	$httpBackend.flush();
	$httpBackend.expectPUT('/wolfmail/message/1?action=archive')
	    .respond(200, {message: {id: 1}});
	$rootScope.$on('message-archived', function(e, newMessage) {
	    emitMessage = newMessage;
	})
	msg.$archive();
	$httpBackend.flush();
	expect(emitMessage).toBeTruthy();
    });
    it('creates a new node related to a message', function() {
	var emitHeading, $scope, msg;
	$scope = $rootScope.$new();
	$httpBackend.expectGET('/wolfmail/message/1').respond(200, {id: 1});
	msg = Message.get({id: 1});
	$httpBackend.flush();
	$httpBackend.expectPOST('/wolfmail/message/1?action=create_heading')
	    .respond(200, {message: {id: 1},
			   heading: {id: 27}});
	$scope.$on('heading-created', function(e, message, newHeading) {
	    emitHeading = newHeading;
	});
	msg.$createNode();
	$httpBackend.flush();
	expect(emitHeading).toBeTruthy();
	expect(emitHeading.id).toEqual(27);
    });
});
