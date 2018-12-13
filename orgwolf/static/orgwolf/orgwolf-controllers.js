import 'angular';
import moment from 'moment';
window.moment = moment;
import 'angular-sanitize';
import 'angular-route';
import 'angular-ui-bootstrap/ui-bootstrap';
import 'angular-ui-calendar';
import 'angular-bootstrap-switch';
import 'fullcalendar';

import 'angularjs-toaster';

"use strict";

angular.module(
    'owMain',
    ['ngAnimate', 'ngResource', 'ngSanitize', 'ngRoute', 'ngCookies',
     'ui.bootstrap', 'ui.calendar', 'toaster', 'frapontillo.bootstrap-switch',
     'owServices', 'owDirectives', 'owFilters']
)

/*************************************************
* Routing for site-wide urls (account settings, etc)
*
**************************************************/
.config(['$routeProvider', function($routeProvider) {
    $routeProvider
	.when('/accounts/settings/', {
	    templateUrl: '/static/settings.html',
	    controller: 'settings',
	});
}])

.controller('settings', ['$scope', '$window', '$resource', '$http', 'toaster', function($scope, $window, $resource, $http, toaster) {
    var Provider, Account, isReadyToSave;
    Provider = $resource('/providers/');
    $scope.providers = Provider.query();
    Account = $resource('/accountassociations/:id/', {'id': '@id'});
    // Get list of linked accounts
    $scope.$on('refresh-data', function() {
	$scope.linkedAccounts = Account.query();
    });
    $scope.linkedAccounts = Account.query();
    $scope.disconnectAccount = function(account) {
	account.$delete().then(function() {
	    toaster.pop('success', 'Deleted');
	    $scope.$emit('refresh-data');
	});
    };
    // Handler for when the user adds a new account
    $scope.addAccount = function(provider) {
	var handlers, handler;
	// Dictionary of handlers for adding various providers
	handlers = {
	    "Google": function(provider) {
		isReadyToSave = true;
	    }
	};
	handler = handlers[provider.button_type];
	handler(provider);
    };
    // Callback for google sign-in
    $window.signInCallbacks = function(result) {
	var data;
	// Submit to the backend for verification
	if (isReadyToSave && !result.error) {
	    data = {"access_token": result.access_token, "code": result.code,
		    "handler_path": "plugins.google"};
	    toaster.pop('info', 'Saving...');
	    Account.save({}, data).$promise.then(
		function(response) {
		    // Success callback
		    toaster.pop('success', 'Saved');
		    $scope.$emit('refresh-data');
		},
		function(response) {
		    if (response.data.reason === 'duplicate') {
			toaster.pop('error', 'Not saved', 'Duplicate Account');
		    } else {
			toaster.pop('error', 'Not saved', 'An error occured. Please check your internet connection and try again.');
			console.log(response);
		    }
		}
	    );
	}
    };
}]);

/*************************************************
* Add a method to the Date object for exporting
* to standard string for dates
*************************************************/
Date.prototype.ow_date = function() {
    var s;
    s = this.getFullYear() + '-' + (this.getMonth()+1) + '-' + this.getDate();
    s = this.toISOString().slice(0, 10);
    return s;
};
