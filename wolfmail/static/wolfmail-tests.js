describe('filters in wolfmail-filters.js:', function() {

    describe('the "format_sender" filter', function() {
	var format_senderFilter;
	beforeEach(module('owFilters'));
	beforeEach(inject(function(_format_senderFilter_) {
	    format_senderFilter = _format_senderFilter_;
	}));

	it('formats a DFRD node', function() {
	    var dfrdMsg = {
		handler_path: 'plugins.deferred',
	    };
	    expect(format_senderFilter(dfrdMsg).toString())
		.toEqual('<span class="dfrd">DFRD</span> Node');
	});

	it('formats a quick-capture node', function() {
	    var qcMsg = {handler_path: 'plugins.quickcapture'};
	    expect(format_senderFilter(qcMsg)).toEqual('Quick capture');
	});

	it('formats a generic message', function() {
	    var qcMsg = {
		sender: 'Malcolm Reynolds'
	    };
	    expect(format_senderFilter(qcMsg)).toEqual('Malcolm Reynolds');
	});
    });

    describe('the "format_subject" filter', function() {
	var format_subjectFilter;
	beforeEach(module('owFilters'));
	beforeEach(inject(function(_format_subjectFilter_) {
	    format_subjectFilter = _format_subjectFilter_;
	}));

	it('formats a quick-capture node', function() {
	    var qcNode = {
		subject: 'QC Msg',
		handler_path: 'plugins.quickcapture'
	    };
	    expect(format_subjectFilter(qcNode)).toEqual('QC Msg');
	});

	it('formats a DFRD node', function() {
	    var dfrdNode, subject;
	    dfrdNode = {
		subject: 'DFRD Node',
		handler_path: 'plugins.deferred',
		source_node: 1,
		node_slug: 'dfrd-node',
	    };
	    expect(format_subjectFilter(dfrdNode).toString())
		.toEqual('<a href="/gtd/projects/#1-dfrd-node">DFRD Node</a>');
	});

	it('formats a generic message', function() {
	    var msg;
	    msg = {
		id: 1,
		subject: 'hello, world',
	    };
	    expect(format_subjectFilter(msg))
		.toEqual('<a href="/wolfmail/inbox/1/">hello, world</a>');
	});
    });

    describe('the "format_date" filter', function() {
	var format_dateFilter;
	beforeEach(module('owFilters'));
	beforeEach( inject(function(_format_dateFilter_) {
	    format_dateFilter = _format_dateFilter_;
	}));

	it('returns a formatted date string', function() {
	    var date_string, date;
	    date_string = '2014-02-08';
	    date = new Date(date_string);
	    expect(format_dateFilter(date_string)).toEqual(date.toDateString());
	});
    });

    describe('the "parent_label" filter', function() {
	var parent_labelFilter;
	beforeEach(module('owFilters'));
	beforeEach(inject(function(_parent_labelFilter_) {
	    parent_labelFilter = _parent_labelFilter_;
	}));

	it('returns a root-level heading\'s title', function() {
	    var rootNode = {
		title: 'Shiny',
		level: 0,
	    };
	    expect(parent_labelFilter(rootNode)).toEqual(rootNode.title);
	});

	it('indents a level-1 heading', function() {
	    var lvlOneNode = {
		title: 'Steamboat springs',
		level: 1
	    };
	    expect(parent_labelFilter(lvlOneNode))
		.toEqual('--- ' + lvlOneNode.title);
	});

	it('indents a level-2 heading twice', function() {
	    var lvlTwoNode = {
		title: 'margins of steel',
		level: 2,
	    };
	    expect(parent_labelFilter(lvlTwoNode))
		.toEqual('------ ' + lvlTwoNode.title);
	});
    });

}); // End of wolfmail-filters.js tests

describe('directives in wolfmail-directives.js', function() {
    var $compile, element, $rootScope, $httpBackend, $templateCache, Message;
    beforeEach(module('owDirectives', 'owServices'));

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

    describe('owMsgActions directive', function() {
	var message;
	beforeEach(function() {
	    $templateCache.put('/static/message-modals.html',
			       '');
	    element = $compile('<div ow-msg-actions></div>')($scope);
	    message = Message.get({id: 1});
	    $httpBackend.flush();
	});
    });

    describe('owMessageRow', function() {
	beforeEach(function() {
	    $rootScope.message = {id: 1};
	    element = $compile('<div ow-message-row></div>')($rootScope);
	});
	it('responds to the "heading-created" signal', function() {
	    $scope = element.scope();
	    expect($scope.headings.length).toEqual(0);
	    $scope.$broadcast('heading-created', {id: 1}, {id: 27});
	    expect($scope.headings.length).toEqual(1);
	});
	it('checks id for "heading-created" signal', function() {
	    $scope = element.scope();
	    $scope.$broadcast('heading-created', {id: 2}, {id: 27});
	    expect($scope.headings.length).toEqual(0);
	});
    });

    describe('owMessageHeading', function() {
	beforeEach(function() {
	    $rootScope.heading = {id: 1};
	    element = $compile('<div ow-message-heading></div>')($rootScope);
	    $httpBackend.whenGET('/gtd/todostates').respond(200, []);
	});
	it('responds to the finishEdit signal', function() {
	    $rootScope.$digest();
	    $scope = element.scope();
	    expect($scope.isEditable).toBe(false);
	    $scope.isEditable = true;
	    $scope.$emit('finishEdit');
	    expect($scope.isEditable).toBe(false);
	});
    });

}); // End of wolfmail-directives.js tests

describe('services in wolfmail-services.js', function() {
    var $httpBackend, $rootScope;
    beforeEach(module('owServices'));
    beforeEach(inject(function($injector) {
	$httpBackend = $injector.get('$httpBackend');
	$rootScope = $injector.get('$rootScope');
    }));
    afterEach(function() {
	$httpBackend.verifyNoOutstandingExpectation();
    });

    describe('the Message $resource object', function() {
	var Message;
	beforeEach(inject(function($injector) {
	    Message = $injector.get('Message');
	    $httpBackend = $injector.get('$httpBackend');
	}));
	it('retrieves message list', function() {
	    $httpBackend.expectGET('/wolfmail/message').respond(200, []);
	    Message.query();
	});
	it('retrieves individual message', function() {
	    $httpBackend.expectGET('/wolfmail/message/1').respond(200, {});
	    Message.get({id: 1});
	});
	it('archives a retrieved message', function() {
	    var emitMessage, $scope;
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
	    var emitHeading;
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

}); // End of wolfmail-services.js test

describe('wolfmail-ctrl.js', function() {
    var $controller, $rootScope, $scope, dummyMessages, $httpBackend;
    beforeEach(module('owMain'));
    beforeEach(inject(function($injector) {
	$controller = $injector.get('$controller');
	$rootScope = $injector.get('$rootScope');
	$scope = $rootScope.$new();
	dummyMessages = [{id: 1}];
	$httpBackend = $injector.get('$httpBackend');
	$httpBackend.whenGET('/gtd/contexts').respond(200, []);
	$httpBackend.whenGET('/gtd/focusareas').respond(200, []);
	$httpBackend.whenGET(/\/wolfmail\/message\?.*/).respond(200, dummyMessages);
	$httpBackend.whenGET(/\/gtd\/nodes.*/).respond(200, []);
    }));
    describe('the owInbox controller', function() {
	beforeEach(inject(function($rootScope, $controller, _$httpBackend_) {
	    $controller('owInbox', {$scope: $scope});
	}));
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
});
