/*globals document, $, jQuery, gtd_module, Message*/
"use strict";
var MessageFactory, owinbox;

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
	}
    );
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
	    s = '<a href="/gtd/project/';
	    s += msg.fields.source_node + '/';
	    s += msg.fields.node_slug + '/">';
	    s += '<span class="dfrd">DFRD</span> Node';
	    s += '</a>';
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
	$bTask = $element.find('.glyphicon-tasks');
	$bProject = $element.find('.glyphicon-folder-close');
	$bComplete = $element.find('.glyphicon-check');
	$bDefer = $element.find('.glyphicon-time');
	$bArchive = $element.find('.glyphicon-save');
	$bDelete = $element.find('.glyphicon-trash');
	// Set button visibility for this row
	if (attrs.owHandler === 'plugins.deferred') {
	    // Deferred nodes
	    $bProject.hide();
	    $bDefer.hide();
	    $bArchive.hide();
	    $bDelete.hide();
	} else {
	    $bComplete.hide();
	}
    }
    return {
	link: link,
    };
});

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
    // Date for this inbox allows user to see future dfrd msgs
    today = new Date();
    $scope.current_date = today;
    ds = today.getFullYear() + '-' + (today.getMonth() + 1);
    ds += '-' + today.getDate() + 'T23:59:59Z';
    // Find the modals for processing messages
    $scope.$task_modal = $('.modal.task');
    $scope.$delete_modal = $('.modal.delete');
    $scope.$defer_modal = $('.modal.defer');
    // Get list of messages
    get_messages = function(e) {
	$scope.messages = MessageAPI.query(
	    {in_inbox: true,
	     rcvd_date__lte: ds}
	);
    };
    $rootScope.$on('refresh_messages', get_messages);
    get_messages();
    // Get list of top level projects
    $scope.projects = Heading.query({'parent_id': 0,
				     'archived': false});
    // Data container for creating a new Node from a message
    $scope.new_node = {$scope: $scope,
		       list: $scope.messages};
    // Angular handlers
    $scope.create_task_modal = function(msg) {
	$scope.new_node.title = msg.fields.subject;
	delete $scope.new_node.tree_id;
	delete $scope.new_node.parent;
	if ( msg.fields.handler_path === 'plugins.deferred' ) {
	    // Deferred nodes don't show the modal
	    delete $scope.new_node.tree_id;
	    delete $scope.new_node.parent;
	    msg.create_node($scope.new_node);
	} else {
	    // Show a modal for creating a new Node
	    $scope.active_msg = msg;
	    $scope.modal_task = true;
	    $scope.$task_modal.modal();
	}
    };
    $scope.open_task_modal = function(msg) {
	$scope.new_node.close = false;
	$scope.create_task_modal(msg);
    };
    $scope.complete_task = function(msg) {
	$scope.new_node.close = true;
	$scope.create_task_modal(msg);
    };
    $scope.create_project_modal = function(msg) {
	delete $scope.new_node.tree_id;
	delete $scope.new_node.parent;
	$scope.new_node.title = msg.fields.subject;
	$scope.active_msg = msg;
	$scope.modal_task = false;
	$scope.$task_modal.modal();
    };
    $scope.defer_modal = function(msg) {
	var today;
	today = new Date();
	$scope.active_msg = msg;
	$scope.$defer_modal.modal();
	$scope.$defer_modal.find('.datepicker').datepicker({
	    format: 'yyyy-mm-dd',
	    todayBtn: true,
	    todayHighlight: true,
	    startDate: today,
	});
    };
    $scope.archive_msg = function(msg) {
	// Remove the message from the inbox in the database
	msg.archive($scope.new_node);
    };
    $scope.delete_modal = function(msg) {
	$scope.active_msg = msg;
	$scope.$delete_modal.modal();
    };
    $scope.change_project = function(project) {
	// Get a list of descendants for the selected project(tree)
	$scope.parents = Heading.query({tree_id: project.tree_id,
					archived: false});
	$scope.parent = project;
    };
    $scope.change_parent = function(parent) {
	// User picked a new project for the Node()
	$scope.new_node.parent = parent.id;
    };
    $scope.create_node = function() {
	// Send the new Node to the API
	$scope.$task_modal.modal('hide');
	$scope.active_msg.create_node($scope.new_node);
    };
    $scope.defer_msg = function() {
	// Reschedule this message to appear in the future
	$scope.new_node.target_date = $scope.$defer_modal.find('#target-date').val();
	console.log($scope.new_node);
	$scope.active_msg.defer($scope.new_node);
	$scope.defer_modal.modal('hide');
    };
    $scope.delete_node = function() {
	// Delete the message in the database
	$scope.$delete_modal.modal('hide');
	$scope.active_msg.delete_msg($scope.new_node);
    };
}
