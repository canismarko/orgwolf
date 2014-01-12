/*globals document, $, jQuery, gtd_module, Message*/
"use strict";
var MessageFactory, owinbox, owmessage;

/*************************************************
* Angular routing
*
**************************************************/
gtd_module.config(
    ['$routeProvider', '$locationProvider',
     function($routeProvider, $locationProvider) {
	 $locationProvider.html5Mode(true);
	 $routeProvider.
	     when('/wolfmail/inbox/', {
		 templateUrl: '/static/inbox.html',
		 controller: 'owInbox'
	     }).
	     when('/wolfmail/inbox/:msg_id/', {
		 templateUrl: '/static/message.html',
		 controller: 'owMessage'
	     });
}]);

/*************************************************
* Factor that creates a message object
*
**************************************************/
gtd_module.factory('MessageAPI', ['$resource', '$http', MessageFactory]);
function MessageFactory($resource, $http) {
    var res = $resource(
	'/wolfmail/message/:id', {id: '@id'},
	{
	    'query': {
		method: 'GET',
		transformResponse: $http.defaults.transformResponse.concat([
		    function (data, headersGetter) {
			var i, new_message;
			for ( i=0; i<data.length; i+=1 ) {
			    new_message = new Message(data[i]);
			    data[i] = new_message;
			}
			return data;
		    }
		]),
		isArray: true
	    },
	    'get': {
		method: 'GET',
		transformResponse: $http.defaults.transformResponse.concat([
		    function(data) {
			return new Message(data);
		    }
		])
	    }
	}
    );
    // Attach custom methods to the prototype
    res.prototype.create_node = Message.prototype.create_node;
    res.prototype.delete_msg = Message.prototype.delete_msg;
    res.prototype.archive = Message.prototype.archive;
    res.prototype.defer = Message.prototype.defer;
    return res;
}

/*************************************************
* Filter that displays the "From" field
**************************************************/
gtd_module.filter('format_sender', ['$sce', function($sce) {
    return function(msg) {
	var s;
	if (msg.fields.handler_path === 'plugins.deferred') {
	    // Message from a deferred Node
	    s = '';
	    s += '<span class="dfrd">DFRD</span> Node';
	    s = $sce.trustAsHtml(s);
	} else if (msg.fields.handler_path === 'plugins.quickcapture' ) {
	    s = 'Quick capture';
	} else {
	    s = msg.fields.sender;
	}
	return s;
    };
}]);

/*************************************************
* Filter that formats the "Subject" field
**************************************************/
gtd_module.filter('format_subject', ['$sce', function($sce) {
    return function(msg) {
	var s;
	s = '';
	if (msg.fields.handler_path === 'plugins.deferred') {
	    // Message from a deferred Node
	    s = '<a href="/gtd/project/#';
	    s += msg.fields.source_node + '-';
	    s += msg.fields.node_slug + '">';
	    s += msg.fields.subject;
	    s += '</a>';
	    s = $sce.trustAsHtml(s);
	} else if (msg.fields.handler_path === 'plugins.quickcapture' ) {
	    // Quick-captured message
	    s = msg.fields.subject;
	} else {
	    s = '<a href="/wolfmail/inbox/' + msg.pk + '/">';
	    s += msg.fields.subject;
	    s += '</a>';
	}
	return s;
    };
}]);

/*************************************************
* Filter that displays various date fields
**************************************************/
gtd_module.filter('format_date', function() {
    return function(date_str) {
	var d;
	d = new Date(date_str);
	return d.toDateString();
    };
});

/*************************************************
* Filter that shows a parent select option with
*   tree indentation
**************************************************/
gtd_module.filter('parent_label', function() {
    return function(parent) {
	var s, i;
	s = ' ' + parent.title;
	for ( i=0; i<parent.level; i+=1 ) {
	    s = '---' + s;
	}
	return s;
    };
});

/*************************************************
* Directive sets the parameters of next
* actions table row
**************************************************/
gtd_module.directive('owMessageRow', function() {
    function link(scope, element, attrs) {
	var $element, $bTask, $bProject, $bComplete, $bDefer, $bArchive, $bDelete;
	$element = $(element);
	$element.find('.glyphicon').tooltip();
	// Find buttons
	$bTask = $element.find('.msg-task');
	$bProject = $element.find('.msg-project');
	$bComplete = $element.find('.msg-complete');
	$bDefer = $element.find('.msg-defer');
	$bArchive = $element.find('.msg-save');
	$bDelete = $element.find('.msg-delete');
	// Set button visibility for this row
	if (attrs.owHandler === 'plugins.deferred') {
	    // Deferred nodes
	    $bProject.remove();
	    $bDefer.remove();
	    $bArchive.remove();
	    $bDelete.remove();
	} else {
	    $bComplete.remove();
	}
    }
    return {
	link: link,
    };
});

/*************************************************
* Directive that handles actions on messages
*
**************************************************/
gtd_module.directive('owMsgActions', ['Heading', function(Heading) {
    // Directive handles actions modal on message object
    function link(scope, element, attrs) {
	var $element;
	// Find jQuery elements
	$element = $(element);
	scope.$task_modal = $element.find('.modal.task');
	scope.$delete_modal = $element.find('.modal.delete');
	scope.$defer_modal = $element.find('.modal.defer');
	// Object tracks the new node that's being created
	if ( scope.new_node === undefined ) {
	    scope.new_node = {};
	}
	scope.new_node.$scope = scope;
	// Handlers for showing modals
	scope.create_task_modal = function(msg) {
	    // Abstract handler: shows modal for creating a new task
	    scope.new_node.title = msg.fields.subject;
	    delete scope.new_node.tree_id;
	    delete scope.new_node.parent;
	    if ( msg.fields.handler_path === 'plugins.deferred' ) {
		// Deferred nodes don't show the modal
		msg.create_node(scope.new_node);
	    } else {
		// Show a modal for creating a new Node
		scope.active_msg = msg;
		scope.modal_task = true;
		scope.$task_modal.modal();
	    }
	};
	scope.open_task_modal = function(msg) {
	    // Shows modal for creating a new NEXT task
	    scope.new_node.close = false;
	    scope.create_task_modal(msg);
	};
	scope.complete_task = function(msg) {
	    // Shows modal for creating a DONE task (from DFRD Nodes)
	    scope.new_node.close = true;
	    scope.create_task_modal(msg);
	};
	scope.create_project_modal = function(msg) {
	    // Shows modal for creating a new project (root Node)
	    delete scope.new_node.tree_id;
	    delete scope.new_node.parent;
	    scope.new_node.title = msg.fields.subject;
	    scope.active_msg = msg;
	    scope.modal_task = false;
	    scope.$task_modal.modal();
	};
	scope.defer_modal = function(msg) {
	    // Show modal for rescheduling a Message for a future date
	    var today;
	    today = new Date();
	    scope.active_msg = msg;
	    scope.$defer_modal.modal();
	    scope.$defer_modal.find('.datepicker').datepicker({
		format: 'yyyy-mm-dd',
		todayBtn: true,
		todayHighlight: true,
		startDate: today,
	    });
	};
	scope.delete_modal = function(msg) {
	    scope.active_msg = msg;
	    scope.$delete_modal.modal();
	};
	// Handlers for commiting actions
	scope.archive_msg = function(msg) {
	    // Remove the message from the inbox in the database
	    msg.archive(scope.new_node);
	};
	scope.change_project = function(project) {
	    // Get a list of descendants for the selected project(tree)
	    scope.parents = Heading.query({tree_id: project.tree_id,
					    archived: false});
	    scope.parent = project;
	};
	scope.change_parent = function(parent) {
	    // User picked a new project for the Node()
	    scope.new_node.parent = parent.id;
	};
	scope.create_node = function() {
	    // Send the new Node to the API
	    scope.$task_modal.modal('hide').one('hidden.bs.modal', function() {
		scope.active_msg.create_node(scope.new_node);
	    });
	};
	scope.defer_msg = function() {
	    // Reschedule this message to appear in the future
	    scope.new_node.target_date = scope.$defer_modal.find('#target-date').val();
	    scope.$defer_modal.modal('hide').one('hidden.bs.modal', function() {
		scope.active_msg.defer(scope.new_node);
	    });
	};
	scope.delete_node = function() {
	    // Delete the message in the database
	    scope.$delete_modal.modal('hide').one('hidden.bs.modal', function() {
		scope.active_msg.delete_msg(scope.new_node);
	    });
	};
    }
    return {
	link: link,
	templateUrl: '/static/message-modals.html'
    };
}]);

/*************************************************
* Angular inbox controller
*
**************************************************/
gtd_module.controller(
    'owInbox',
    ['$scope', '$rootScope', '$resource', 'MessageAPI', 'Heading', owinbox]
);
function owinbox($scope, $rootScope, $resource, MessageAPI, Heading) {
    var ds, today, get_messages;
    $('.ow-active').removeClass('active');
    $('#nav-inbox').addClass('active');
    // Date for this inbox allows user to see future dfrd msgs
    today = new Date();
    $scope.current_date = today;
    // Get list of messages
    $scope.get_messages = function(e) {
	$scope.messages = MessageAPI.query(
	    {in_inbox: true,
	     now: true}
	);
    };
    $rootScope.$on('refresh_messages', $scope.get_messages);
    $scope.get_messages();
    // Call back for when a message is processed
    $scope.success = function(msg) {
	$scope.messages.remove(msg);
    };
}

/*************************************************
* Angular controller for viewing a specific message
*
**************************************************/
gtd_module.controller(
    'owMessage',
    ['$scope', '$routeParams', '$location', 'MessageAPI', owmessage]
);
function owmessage($scope, $routeParams, $location, MessageAPI) {
    var msg, msg_id;
    msg_id = $routeParams.msg_id;
    $scope.msg = MessageAPI.get({id: msg_id});
    // Call back for when message is processed
    $scope.success = function(msg) {
	$location.path('/wolfmail/inbox');
    };
}

/*************************************************
* Angular controller for delivering feedback
*
**************************************************/
gtd_module.directive('owFeedback', function() {
    function link(scope, element, attrs) {
	var $element, $modal;
	$element = $(element);
	$modal = $element.find('#feedbackModal');
	scope.feedback = {};
	scope.send_feedback = function(feedback) {
	    $.ajax('/feedback/', {
		type: 'POST',
		data: {body: feedback.text},
		success: function() {
		    scope.$apply(function() {
                        // Confirmation feedback to the user
                        scope.success = true;
                        setTimeout(function() {
                            scope.$apply(function() {
                                scope.success = false;
                                scope.feedback = {};
                                $modal.modal('hide');
                            });
                        }, 1200);
                    });
		},
		error: function(jqXHR, textStatus, error) {
		    console.log(error);
		}
	    });
	};
    }
    return {
	link: link,
	templateUrl: '/static/feedback-modal.html'
    };
});
