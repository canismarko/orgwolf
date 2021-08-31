"use strict";

import "angular";

angular.module("orgwolf.wolfmail")
    .directive('owFeedback', owFeedback);



owFeedback.$inject = ['$http', '$timeout'];


function owFeedback($http, $timeout) {
    /*************************************************
     * Angular controller for delivering feedback
     *
     **************************************************/
    function link(scope, element, attrs) {
	scope.$modal = element.find('#feedbackModal');
	scope.feedback = {};
	scope.send_feedback = function(feedback) {
	    $http.post('/feedback/', {body: feedback.text})
		.then(function onSuccess(response) {
		    // Confirmation feedback to the user
                    scope.success = true;
		}, function onError(response) {
		    console.log(response);
		});
	};
	// Event listener clears the form when it is hidden
	scope.$modal[0].addEventListener("hidden.bs.modal", function (event) {
	    scope.success = false;
	    scope.feedback = {};
	    scope.form.$setPristine();
	    scope.$apply();
	});
    }
    return {
	link: link,
	templateUrl: '/static/feedback-modal.html'
    };
}
