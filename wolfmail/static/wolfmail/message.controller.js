"use strict";

import "angular";

angular.module("orgwolf.wolfmail")
    .controller('owMessage', owMessage);


owMessage.$inject = ['$scope', '$routeParams', '$location', 'Message'];


function owMessage($scope, $routeParams, $location, Message) {
    /*************************************************
     * Angular controller for viewing a specific message
     *
     **************************************************/
    var msg, msg_id;
    msg_id = $routeParams.msg_id;
    $scope.msg = Message.get({id: msg_id});
    // Call back for when message is processed
    $scope.success = function(msg) {
	$location.path('/wolfmail/inbox');
    };
}
