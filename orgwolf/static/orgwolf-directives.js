/*globals angular, $ */
"use strict";

angular.module('owDirectives')

.directive('owNavbar', ['$location', '$cookies', 'contexts', function($location, $cookies, contexts) {
    function link(scope, element, attrs) {
	var regexps;
	regexps = {
	    'actions': new RegExp('^/gtd/actions'),
	    'inbox': new RegExp('^/wolfmail/inbox/'),
	    'projects': new RegExp('^/gtd/project/'),
	    'calendar': new RegExp('^/calendar/')
	};
	function setActiveLink() {
	    var found, r, currPath, linkId;
	    // Clear old active links
	    $('ul.navbar-nav li').removeClass('active');
	    // Find and set new active link
	    currPath = $location.path();
	    for (linkId in regexps) {
		if (regexps.hasOwnProperty(linkId)) {
		    r = regexps[linkId].exec(currPath);
		    if (r) {
			$('#nav-' + linkId).addClass('active');
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
