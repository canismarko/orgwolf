"use strict";
import jQuery from 'jquery';
import "angular";
import 'orgwolf-services';
import 'gtd-services';

angular.module(
    'owDirectives',
    ['ngAnimate', 'ngResource', 'ngCookies', 'owServices', 'toaster']
)

// Directive to allow for select inputs to be bound to numeric models
// taken from: https://code.angularjs.org/1.4.7/docs/api/ng/directive/select
// #binding-select-to-a-non-string-value-via-ngmodel-parsing-formatting
.directive('convertToNumber', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, ngModel) {
      ngModel.$parsers.push(function(val) {
        return parseInt(val, 10);
      });
      ngModel.$formatters.push(function(val) {
        return '' + val;
      });
    }
  };
})

.directive('owNavbar', ['$location', '$cookies', 'contexts', 'currentUser', function($location, $cookies, contexts, currentUser) {
    function link(scope, element, attrs) {
	var regexps;
	scope.user = currentUser;
	regexps = {
	    'actions': new RegExp('^/gtd/actions'),
	    'inbox': new RegExp('^/wolfmail/inbox/'),
	    'projects': new RegExp('^/gtd/projects/'),
	    'calendar': new RegExp('^/calendar/')
	};
	function setActiveLink() {
	    var found, r, currPath, linkId;
	    // Clear old active links
	    jQuery('ul.navbar-nav li').removeClass('active');
	    // Find and set new active link
	    currPath = $location.path();
	    for (linkId in regexps) {
		if (regexps.hasOwnProperty(linkId)) {
		    r = regexps[linkId].exec(currPath);
		    if (r) {
			jQuery('#nav-' + linkId).addClass('active');
		    }
		}
	    }
	}
	setActiveLink();
	scope.$on('$locationChangeSuccess', function(e) {
	    setActiveLink();
	});
	// Update the next actions link based on the currently selected scope
	scope.$watch(function() {
	    return $cookies.activeContext;
	}, function(newContext) {
	    newContext = parseInt(newContext, 10);
	    contexts.$promise.then(function() {
		// Find the active context and set the link attributes
		scope.activeContext = contexts.filter(function(context) {
		    return context.id === newContext;
		})[0];
	    });
	});
    }
    return {
	scope: true,
	link: link
    };
}]);
