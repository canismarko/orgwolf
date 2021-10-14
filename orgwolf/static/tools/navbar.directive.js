"use script";

angular.module("orgwolf.tools")
    .directive('owNavbar', owNavbar);


owNavbar.$inject = ['$location', '$cookies', 'contexts', 'currentUser'];

function owNavbar($location, $cookies, contexts, currentUser) {
    function link(scope, element, attrs) {
        var regexps;
        scope.user = currentUser;
        regexps = {
            'actions': new RegExp('^/gtd/actions'),
            'inbox': new RegExp('^/wolfmail/inbox/'),
            'projects': new RegExp('^/gtd/projects/'),
            'calendar': new RegExp('^/calendar/'),
	    'review': new RegExp('^/gtd/review/')
        };
        function setActiveLink() {
            var found, r, currPath, linkId;
            // Clear old active links
            jQuery(element).find('.navbar__item > a').removeClass('active');
            // Find and set new active link
            currPath = $location.path();
            for (linkId in regexps) {
                if (regexps.hasOwnProperty(linkId)) {
                    r = regexps[linkId].exec(currPath);
                    if (r) {
                        jQuery('#nav-' + linkId).children("a").addClass('active');
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
}
