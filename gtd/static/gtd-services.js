/*globals angular, GtdHeading, jQuery, navigator, window, alert*/
"use strict";
var HeadingFactory;

var owServices = angular.module(
    'owServices',
    ['ngResource']
);

/*************************************************
* Factory returns the persona navigator for
* login/logout functions.
*
**************************************************/
owServices.value('personaUser', null); // Default value, override in django
owServices.factory('personaNavigator', ['personaUser', '$rootScope', '$http', 'owWaitIndicator', 'activeState', function(personaUser, $rootScope, $http, owWaitIndicator, activeState) {
    if ( typeof navigator.id !== 'undefined' ) {
	// Setup the persona navigator before linking the directive
	navigator.id.watch({
	    loggedInUser: personaUser,
	    onlogin: function(assertion) {
		// A user has logged in! Here you need to:
		// 1. Send the assertion to your backend for verification and to create a session.
		// 2. Update your UI.
		owWaitIndicator.start_wait('medium', 'persona');
		$http.post('/accounts/login/persona/', {assertion: assertion})
		    .success(function(res, status, headers, config) {
			owWaitIndicator.end_wait('medium', 'persona');
			activeState.user = res.user_id;
			$rootScope.$broadcast('refresh-data');
		    })
		    .error(function(xhr, status, err) {
			navigator.id.logout();
			alert("Login failure: " + err);
		    });
	    },
	    onlogout: function() {
		// A user has logged out! Here you need to:
		// Tear down the user's session by redirecting the user or making a call to your backend.
		// Also, make sure loggedInUser will get set to null on the next page load.
		// (That's a literal JavaScript null. Not false, 0, or undefined. null.)
		// ow_waiting('spinner');
		owWaitIndicator.start_wait('medium', 'persona');
		$http.post('/accounts/logout/persona/', {logout: true})
		    .success(function() {
			window.location.reload();
		    })
		    .error(function(data, status, headers, config) {
			alert("Logout failure: ");
		    });
	    }
	});
    }
    return navigator;
}]);

/*************************************************
* Factory returns an object for showing feedback
* if an operation takes a while. Visual elements
* are rendered using the waitFeedback directive.
*
**************************************************/
owServices.factory('owWaitIndicator', ['$rootScope', function($rootScope) {
    var obj, end_wait;
    // Object contains lists and accessors for those lists
    obj = {
	waitLists: {
	    'quick': [],
	    'medium': [],
	},
	start_wait: function(listName, name) {
	    obj.waitLists[listName].push(name);
	},
	end_wait: function(listName, name) {
	    // First check if the user specified all options or set defaults
	    var lists, i;
	    lists = obj.waitLists[listName];
	    if (lists === undefined) {
		// User didn't specify a list so use all
		name = listName;
		lists = [obj.waitLists.quick, obj.waitLists.medium];
	    } else {
		lists = [lists];
	    }
	    // Clear the specified wait from the lists
	    for (i=0; i<lists.length; i+=1) {
		end_wait(lists[i], name);
	    }
	},
    };
    end_wait = function(list, name) {
	// Helper function for removing items from the list
	var i;
	i = list.indexOf(name);
	while (i > -1) {
	    list.splice(i, 1);
	    i = list.indexOf(name);
	}
    };
    return obj;
}]);

/*************************************************
* Factory creates GtdHeading objects
*
**************************************************/
owServices.factory('OldHeading', ['$resource', '$http', function($resource, $http) {
    return function(data) {
        return new GtdHeading(data);
    };
}]);
owServices.factory('Heading', ['$resource', HeadingFactory]);
function HeadingFactory($resource) {
    var res = $resource(
	'/gtd/nodes/:id/',
	{id: '@id',
	 field_group: '@field_group'},
	{
	    'update': {method: 'PUT'},
	    'create': {method: 'POST'},
	}
    );
    return res;
}

/*************************************************
* Default todo states. Override in template from
* server.
*
**************************************************/
owServices.value(
    'todoStatesList',
    [
	{id: 1,
	 color: {
	     red: 0,
	     green: 0,
	     blue: 0,
	     alpha: 0,
	 },
	 abbreviation: 'NEXT',
	},
	{id: 2,
	 color: {
	     red: 0,
	     green: 0,
	     blue: 0,
	     alpha: 0,
	 }
	},
    ]
);

/*************************************************
* Factory returns the request todoStates
*
**************************************************/
owServices.factory('todoStates', ['$resource', 'todoStatesList', function($resource, todoStatesList) {
    var states, TodoState;
    TodoState = $resource('/gtd/todostate/');
    states = TodoState.query();
    states = todoStatesList;
    states.getState = function(stateId) {
	var foundState, foundStates;
	foundStates = this.filter(function(obj) {
	    return obj.id === stateId;
	});
	if (foundStates.length > 0) {
	    foundState = foundStates[0];
	} else {
	    foundState = null;
	}
	return foundState;
    };
    return states;
}]);

/*************************************************
* A list of current messages. Manipulated by the
* notify service.
*
**************************************************/
owServices.factory('notifyList', [function() {
    var list = [];
    return list;
}]);

/*************************************************
* Creates function that lets components show
* messages to the user
*
**************************************************/
owServices.value('notifyTimeout', 4000); //in seconds
owServices.factory('notify', ['notifyList', 'notifyTimeout', '$timeout', function(notifyList, notifyTimeout, $timeout) {
    function removeMessage() {
	notifyList.splice(0, 1);
    }
    function notify(msg, cls) {
	if (typeof cls === 'undefined') {
	    cls = 'info';
	}
	notifyList.push({
	    msg: msg,
	    cls: cls
	});
	// Drop the message after a few seconds
	$timeout(removeMessage, notifyTimeout);
    }
    return notify;
}]);
