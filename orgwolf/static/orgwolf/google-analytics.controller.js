"use strict";

import 'angular';

angular.module('orgwolf')
    .run(googleAnalytics);


googleAnalytics.$inject = ['$rootScope', '$location'];


function googleAnalytics($rootScope, $location) {
    /*************************************************
     * Handler sends google analytics tracking on
     * angular route change
     **************************************************/
    $rootScope.$on('$routeChangeSuccess', function() {
	// Only active if django DEBUG == True
	if ( typeof ga !== 'undefined' ) {
	    ga('send', 'pageview', {'page': $location.path()});
	}
    });
}
