"use strict";
import * as angular from 'angular';

angular.module('owDirectives')

/********************************************************************
/ Directive that shows the user a login prompt and handles the login
/ transaction.
/*******************************************************************/
    .directive('owLogin', ['activeState', function(activeState) {
	function link($scope, $elem, $attrs) {
	    $scope.activeState = activeState;
	}
    return {
	link: link,
	scope: {},
	templateUrl: '/accounts/login/',
    };
}]);
