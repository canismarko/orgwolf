/*globals angular, $*/
"use strict";


var owFilters = angular.module(
    'owFilters',
    ['ngSanitize']
);

/*************************************************
* Filter that determines relationship to the
* url paramater for target node
*
**************************************************/
owFilters.filter('is_target', function() {
    return function(obj, active) {
	var answer = '';
	if (active) {
	    if ( obj.pk === active.id ) {
		answer = 'yes';
	    } else if ( obj.fields.tree_id === active.tree_id &&
			obj.fields.lft < active.lft &&
			obj.fields.rght > active.rght) {
		// Mark ancestors
		answer = 'ancestor';
	    }
	}
	return answer;
    };
});

/*************************************************
* Filter turns a string into a slug
*
**************************************************/
owFilters.filter('slugify', function() {
    return function(string) {
	var s;
	if (string !== undefined) {
	    /*jslint regexp: true */
	    s = string.toLowerCase().replace(/[^a-z_]/g, '-');
	    /*jslint regexp: false */
	}
	return s;
    };
});

/*************************************************
* Filter that determines style of TodoState object
*
**************************************************/
owFilters.filter('todoStateStyle', function() {
    return function(obj) {
	var style, c;
	style = '';
	if (obj === null || obj === undefined) {
	    style = null;
	} else {
	    /* Set text stylings */
	    c = obj.color;
	    style += 'color: rgba(' + c.red + ', ' + c.green + ', ';
	    style += c.blue + ', ' + c.alpha + '); ';
	}
	return style;
    };
});

/*************************************************
* Filter that determines style of Node object
*
**************************************************/
owFilters.filter('headingStyle', function() {
    return function(obj) {
	var style, colors, color_i;
	style = '';
	// Determine color based on node.rank
	if ( obj.level > 0 ) { // Root headings style by CSS
	    colors = ['rgb(80, 0, 0)', 'rgb(0, 44, 19)',
		      'teal', 'slateblue', 'brown'];
	    color_i = (obj.level) % colors.length;
	    style += 'color: ' + colors[color_i - 1] + '; ';
	}
	return style;
    };
});

/*************************************************
* Sanitizes text to safe HTML
*
**************************************************/
owFilters.filter('asHtml', ['$sce', function($sce) {
    return function(obj) {
	var s = $sce.trustAsHtml(obj);
	return s;
    };
}]);

/*************************************************
* Filter that orders top level headings
*
**************************************************/
owFilters.filter('order', ['$sce', function($sce) {
    return function(obj, criterion) {
	var ordered, deadline, other;
	if ( criterion === 'list' ) {
	    other = obj.filter(function(currHeading) {
		return currHeading.deadline_date === null;
	    });
	    deadline = $(obj).not(other).get().order_by('deadline_date');
	    ordered = deadline;
	    ordered = ordered.concat(other.order_by('priority'));
	} else if ( criterion === 'none' ) {
	    ordered = obj;
	} else {
	    ordered = obj.order_by(criterion);
	}
	return ordered;
    };
}]);

/*************************************************
* Filter that only shows headings that are visible
* based on list parameters.
*
**************************************************/
owFilters.filter('currentList', function() {
    return function(headings, todoStates, upcomingList) {
	var upcomingListIds;
	// Filter by todoStates
	if ( todoStates ) {
	    headings = headings.filter(function(h) {
		return todoStates.indexOf(h.todo_state) > -1;
	    });
	}
	// Remove headings that are duplicated in the upcomingList
	if ( upcomingList ) {
	    upcomingListIds = upcomingList.map(function(v) {
		return v.id;
	    });
	    headings = headings.filter(function(h) {
		return upcomingListIds.indexOf(h.id) === -1;
	    });
	}
	return headings;
    };
});

/*************************************************
* Filter that only shows headings that are visible
* in the current scope.
*
**************************************************/
owFilters.filter('currentScope', function() {
    return function(headings, activeScope) {
	if ( activeScope ) {
	    headings = headings.filter(function(h) {
		return h.scope.indexOf(activeScope.id) > -1;
	    });
	}
	return headings;
    };
});

/*************************************************
* Filter that displays the deadline for a heading
*
**************************************************/
owFilters.filter('deadline_str', ['$sce', function($sce) {
    return function(deadline, today) {
	var str, date, time_delta, day_delta;
	if ( typeof today === 'undefined' ) {
	    today = new Date();
	}
	str = '';
	if ( deadline ) {
	    str = 'Due ';
	    date = new Date(deadline + 'T12:00:00');
	    today.setHours(12, 0, 0, 0);
	    time_delta = date.getTime() - today.getTime();
	    day_delta = Math.ceil(time_delta / (1000 * 3600 * 24));
	    if ( day_delta === 0 ) {
		// Is today
		str += 'today';
	    } else if (day_delta === -1) {
		// Is yesterday
		str += 'yesterday';
	    } else if (day_delta < 0) {
		// Is farther in the past
		str += Math.abs(day_delta) + ' days ago';
	    } else if (day_delta === 1) {
		// Is tomorrow
		str += 'tomorrow';
	    } else if (day_delta > 0) {
		// Is farther in the future
		str += 'in ' + day_delta + ' days';
	    }
	}
	return str;
    };
}]);

/*************************************************
* Filter a list (of headings) by the active scope
*
**************************************************/
owFilters.filter('scope', function() {
    return function(oldList, activeScope) {
	var i, newList;
	if (activeScope) {
	    newList = [];
	    for (i=0; i<oldList.length; i+=1) {
		if( oldList[i].scope.indexOf(activeScope) > -1 ) {
		    newList.push(oldList.slice(i, i+1)[0]);
		}
	    }
	} else {
	    newList = oldList.slice(0);
	}
	return newList;
    };
});
