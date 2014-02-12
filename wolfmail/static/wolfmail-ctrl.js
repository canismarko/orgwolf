/*globals document, $, jQuery, owMain, Message*/
"use strict";
var MessageFactory, owinbox, owmessage;

/*************************************************
* Angular routing
*
**************************************************/
owMain.config(
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
* Angular inbox controller
*
**************************************************/
owMain.controller(
    'owInbox',
    ['$scope', '$rootScope', '$resource',
     'MessageAPI', 'Heading', 'owWaitIndicator', owinbox]
);
function owinbox($scope, $rootScope, $resource, MessageAPI, Heading, owWaitIndicator) {
    var ds, today, get_messages;
    $('.ow-active').removeClass('active');
    $('#nav-inbox').addClass('active');
    // Date for this inbox allows user to see future dfrd msgs
    $scope.currentDate = new Date();
    $scope.$watch('currentDate', function(new_date, old_date) {
	$scope.$emit('refresh_messages');
    }, true);
    // Get list of messages
    $scope.get_messages = function(e) {
	owWaitIndicator.start_wait('medium', 'get-messages');
	$scope.messages = MessageAPI.query(
	    {in_inbox: true,
	     rcvd_date__lte: $scope.currentDate.ow_date(),
	    }
	);
	// Callbacks after resolving message API
	$scope.messages.$promise['finally'](function() {
	    owWaitIndicator.end_wait('get-messages');
	});
	$scope.messages.$promise['catch'](function() {
	    $scope.notify('Could not get messages. Check your internet connection and try again', 'danger');
	});
    };
    $rootScope.$on('refresh_messages', $scope.get_messages);
    $scope.$emit('refresh_messages');
    // Get top level projects for "New task" modal
    $scope.projects = Heading.query({'parent_id': 0,
				     'archived': false});
    // Call back for when a message is processed
    $scope.success = function(msg) {
	$scope.messages.remove(msg);
    };
}

/*************************************************
* Angular controller for viewing a specific message
*
**************************************************/
owMain.controller(
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
owMain.directive('owFeedback', function() {
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
