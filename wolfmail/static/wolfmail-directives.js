/*globals owMain, $*/
"use strict";

/*************************************************
* Directive sets the parameters of next
* actions table row
**************************************************/
owMain.directive('owMessageRow', function() {
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
owMain.directive('owMsgActions', ['Heading', function(Heading) {
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
		console.log(scope.new_node);
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
