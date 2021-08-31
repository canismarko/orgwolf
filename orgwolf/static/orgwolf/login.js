"use strict";

import "angular";

angular.module('orgwolf')
    .directive('owLogin', owLogin);


owLogin = ['activeState'];


function owLogin(activeState) {
	/********************************************************************
/ Directive that shows the user a login prompt and handles the login
/ transaction.
/*******************************************************************/
	function link($scope, $elem, $attrs) {
	    $scope.activeState = activeState;
	}
    return {
	link: link,
	scope: {},
	templateUrl: '/accounts/login/',
    };
}
