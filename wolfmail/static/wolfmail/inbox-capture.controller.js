"use strict";

import 'angular';

angular.module('orgwolf.wolfmail')
    .controller('inboxCapture', inboxCapture);


inboxCapture.$inject = ['$scope', '$rootScope', 'owWaitIndicator'];


function inboxCapture($scope, $rootScope, owWaitIndicator) {
    /*************************************************
     * Angular controller for capturing quick thoughts
     * to the inbox
     **************************************************/
    $scope.capture = function(e) {
	// Send a captured inbox item to the server for processing
	var text, data, $textbox;
	data = {handler_path: 'plugins.quickcapture'};
	$textbox = jQuery(e.target).find('#new_inbox_item');
	data.subject = $textbox.val();
	owWaitIndicator.start_wait('medium', 'quickcapture');
	jQuery.ajax(
	    '/wolfmail/message/',
	    {type: 'POST',
	     data: data,
	     complete: function() {
		 $scope.$apply( function() {
		     owWaitIndicator.end_wait('quickcapture');
		 });
	     },
	     success: function() {
		 $textbox.val('');
		 $rootScope.$emit('refresh_messages');
	     },
	     error: function(jqXHR, status, error) {
		 alert('Failed!');
		 console.log(status);
		 console.log(error);
	     }
	    }
	);
    };
}
