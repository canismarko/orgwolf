"use strict";

import "angular";

angular.module("orgwolf")
    .factory('owWaitIndicator', owWaitIndicator);


owWaitIndicator.$inject = ['$rootScope'];


function owWaitIndicator($rootScope) {
    /*************************************************
     * Factory returns an object for showing feedback
     * if an operation takes a while. Visual elements
     * are rendered using the waitFeedback directive.
     *
     **************************************************/

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
}
