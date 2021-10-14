"use strict";
import {module as ngModule} from 'angular';

ngModule('orgwolf.tools')
    .directive('owLogin', owLogin);


owLogin.$inject = ['activeState'];


function owLogin(activeState) {
    /********************************************************************
    * Directive that shows the user a login prompt and handles the login
    * transaction.
    ********************************************************************/
    function link($scope, $elem, $attrs) {
	$scope.activeState = activeState;
    }
    return {
	link: link,
	scope: {},
	templateUrl: '/accounts/login/',
    };
}
