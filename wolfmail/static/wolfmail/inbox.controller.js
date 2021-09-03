"use strict";

import "angular";

angular.module("orgwolf.wolfmail")
    .controller('owInbox', owInbox)


owInbox.$inject = ['$scope', '$rootScope', '$resource', 'Message', 'Heading', 'owWaitIndicator', 'toaster', 'toDateObjFilter'];


function owInbox($scope, $rootScope, $resource, Message, Heading, owWaitIndicator, toaster, toDateObjFilter) {
    /*************************************************
     * Angular inbox controller
     *
     **************************************************/
    var ds, today, get_messages;
    // Date for this inbox allows user to see future dfrd msgs
    $scope.currentDate = new Date();
    $scope.$watch('currentDate', function(new_date, old_date) {
	$scope.$emit('refresh_messages');
    }, true);
    // Get list of messages
    $scope.get_messages = function(e) {
	owWaitIndicator.start_wait('quick', 'get-messages');
	$scope.messages = Message.query(
	    {in_inbox: true,
	     rcvd_date__lte: $scope.currentDate.ow_date(),
	    }
	);
	// Callbacks after resolving message API
	$scope.messages.$promise['then'](function(messages) {
	    var message, i;
	    // Convert the received date and a Date() object
	    for (i=0; i<$scope.messages.length; i+=1) {
		message = $scope.messages[i];
		message.rcvd_date = toDateObjFilter(message.rcvd_date);
	    }
	});
	$scope.messages.$promise['finally'](function() {
	    owWaitIndicator.end_wait('get-messages');
	});
	$scope.messages.$promise['catch'](function() {
	    toaster.pop('error', "Error getting messages.", "Check your internet connection and try again");
	});
    };
    $rootScope.$on('refresh_messages', $scope.get_messages);
    $rootScope.$on('refresh-data', $scope.get_messages);
    $scope.$emit('refresh_messages');
    // Respond to signals generated by the action buttons
    function removeMessage(message) {
	var i = $scope.messages.map(function(msg) {
	    return msg.id;
	}).indexOf(message.id);
	$scope.messages.splice(i, 1);
    }
    $scope.$on('message-archived', function(e, message) {
	// Remove the archived message from messages.
	removeMessage(message);
    });
    $scope.$on('message-deferred', function(e, message) {
	removeMessage(message);
    });
    $scope.$on('heading-created', function(e, message) {
	if ( !message.in_inbox ) {
	    removeMessage(message);
	}
    });
    // Get top level projects for "New task" modal
    $scope.projects = Heading.query({'parent_id': 0,
				     'archived': false});
    // Call back for when a message is processed
    $scope.success = function(msg) {
	$scope.messages.remove(msg);
    };
}