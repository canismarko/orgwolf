"use strict";

import "angular";
import "angular-mocks";


describe('owMsgActions directive', function() {
    var message;
    beforeEach(function() {
	$templateCache.put('/static/message-modals.html',
			   '');
	element = $compile('<div ow-msg-actions></div>')($scope);
	message = Message.get({id: 1});
	$httpBackend.flush();
    });
    afterEach(function() {
	$httpBackend.verifyNoOutstandingExpectation();
    });
    it("has no tests");
});
