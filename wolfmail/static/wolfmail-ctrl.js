/*globals angular */
"use strict";
var MessageFactory, owinbox, owmessage;

angular.module('owMain')

/*************************************************
* Angular routing
*
**************************************************/
.config(
    ['$routeProvider', '$locationProvider',
     function($routeProvider, $locationProvider) {
	 $locationProvider.html5Mode({enabled: true, requireBase: false});
	 $routeProvider.
	     when('/wolfmail/inbox/', {
		 templateUrl: '/static/inbox.html',
		 controller: 'owInbox'
	     }).
	     when('/wolfmail/inbox/:msg_id/', {
		 templateUrl: '/static/message.html',
		 controller: 'owMessage'
	     });
}])

/*************************************************
* Angular inbox controller
*
**************************************************/
.controller('owInbox', ['$scope', '$rootScope', '$resource', 'Message', 'Heading', 'owWaitIndicator', 'toaster', function($scope, $rootScope, $resource, Message, Heading, owWaitIndicator, toaster) {
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
}])

/*************************************************
* Angular controller for viewing a specific message
*
**************************************************/
.controller('owMessage', ['$scope', '$routeParams', '$location', 'Message', function($scope, $routeParams, $location, Message) {
    var msg, msg_id;
    msg_id = $routeParams.msg_id;
    $scope.msg = Message.get({id: msg_id});
    // Call back for when message is processed
    $scope.success = function(msg) {
	$location.path('/wolfmail/inbox');
    };
}])

/*************************************************
* Angular controller for delivering feedback
*
**************************************************/
.directive('owFeedback', ['$http', '$timeout', function($http, $timeout) {
    function link(scope, element, attrs) {
	var $modal;
	$modal = element.find('#feedbackModal');
	scope.feedback = {};
	scope.send_feedback = function(feedback) {
	    $http.post('/feedback/', {body: feedback.text})
	    .success(function() {
                // Confirmation feedback to the user
                scope.success = true;
		$timeout(function() {
                    scope.success = false;
                    scope.feedback = {};
                    $modal.modal('hide');
                }, 1200);
	    })
	    .error(function(data, status, headers) {
		    console.log(data);
	    });
	};
    }
    return {
	link: link,
	templateUrl: '/static/feedback-modal.html'
    };
}]);
