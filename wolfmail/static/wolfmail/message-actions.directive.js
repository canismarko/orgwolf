"use strict";

import "angular";
import {Modal} from 'bootstrap/dist/js/bootstrap.bundle.min.js';;

angular.module("orgwolf.wolfmail")
    .directive('owMsgActions', owMsgActions);


owMsgActions = ['Heading', 'dateFilter', 'owNotifier'];


function owMsgActions(Heading, dateFilter, owNotifier) {
    /*************************************************
     * Directive that handles actions on messages
     *
     **************************************************/
    // Directive handles actions modal on message object
    function link(scope, element, attrs) {
	var $element, MessageApi;
	// Find jQuery elements
	$element = $(element);
	scope.$task_modal = $element.find('.modal.task');
	scope.task_modal = new Modal(scope.$task_modal);
	scope.$delete_modal = $element.find('.modal.delete');
	scope.delete_modal = new Modal(scope.$delete_modal);
	scope.$defer_modal = $element.find('.modal.defer');
	scope.defer_modal = new Modal(scope.$defer_modal);
	// Object tracks the new node that's being created
	if ( scope.new_node === undefined ) {
	    scope.new_node = {};
	}
	// Handlers for showing modals
	scope.create_task_modal = function(msg) {
	    // Abstract handler: shows modal for creating a new task
	    scope.new_node.title = msg.subject;
	    if ( msg.handler_path === 'plugins.deferred' ) {
		// Deferred nodes don't show the modal
		msg.$createNode();
	    } else {
		// Show a modal for creating a new Node
		scope.active_msg = msg;
		scope.modal_task = true;
		scope.task_modal.show()
	    }
	};
	scope.open_task_modal = function(msg) {
	    // Shows modal for creating a new NEXT task
	    scope.new_node.close = false;
	    scope.create_task_modal(msg);
	};
	scope.completeTask = function(msg) {
	    // Make the Node as completed in the API
	    msg.$createNode({close: true});
	};
	scope.create_project_modal = function(msg) {
	    // Shows modal for creating a new project (root Node)
	    delete scope.new_node.tree_id;
	    delete scope.new_node.parent;
	    scope.new_node.title = msg.subject;
	    scope.active_msg = msg;
	    scope.modal_task = false;
	    scope.task_modal.show();
	};
	scope.show_defer_modal = function(msg) {
	    // Show modal for rescheduling a Message for a future date
	    var today;
	    today = new Date().toISOString().split('T')[0];
	    scope.$defer_modal.find('#target-date').val(today);
	    scope.active_msg = msg;
	    scope.defer_modal.show();
	};
	scope.show_delete_modal = function(msg) {
	    scope.active_msg = msg;
	    scope.delete_modal.show();
	};
	// Handlers for commiting actions
	scope.archive = function(msg) {
	    msg.$archive();
	};
	scope.createNode = function(msg) {
	    // Send the new Node to the API
	    scope.task_modal.hide();
	    msg.$createNode(scope.new_node);
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
	scope.deferMessage = function() {
	    scope.defer_modal.hide();
	    // Reschedule this message to appear in the future
	    scope.new_node.target_date = scope.$defer_modal.find('#target-date').val();
	    var newDate = dateFilter(scope.new_node.target_date, 'yyyy-MM-dd');
	    scope.active_msg.$defer({target_date: newDate})
		.then(function(message) {
		    var s = 'Deferred until ';
		    s += dateFilter(message.rcvd_date, 'yyyy-MM-dd');
		    owNotifier.info(s);
		    console.log('rescheduled');
		    console.log(message);
		});
	    
	};
	scope.delete_node = function() {
	    // Delete the message in the database
	    scope.delete_modal.hide();
	    scope.active_msg.$delete().then(function() {
		scope.messages.splice(
		    scope.messages.indexOf(scope.active_msg),
		    1
		);
	    });
	    // scope.active_msg.delete_msg(scope.new_node);
	};
    }
    return {
	link: link,
	scope: false,
	templateUrl: '/static/message-modals.html'
    };
}
