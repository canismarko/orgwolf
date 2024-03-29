"use strict";

import "angular";

angular.module('orgwolf.projectOutline')
    .directive('owTwisty', owTwisty);


owTwisty.$inject = ['$compile', '$rootScope', 'Heading', 'activeHeading', 'openReview'];


function owTwisty($compile, $rootScope, Heading, activeHeading, openReview) {
	/*************************************************
	 * Directive forms a node in an outline (and takes
	 * care of any child nodes).
	 *
	 **************************************************/
    function link(scope, element, attrs) {
	var hoverable, get_children, twistyElement;
	scope.isEditing = false;
	scope.loadedChildren = false;
	scope.state = 0;
	element.addClass('gtd-outline__node--state-'+scope.state);
	scope.showArchived = $rootScope.showArchived;
	// Get todo-states
	if ($rootScope.todoStates) {
	    scope.todoStates = $rootScope.todoStates;
	} else {
	    scope.todoStates = [];
	}
	if ( scope.todoState && scope.todoState.actionable ) {
	    element.addClass('.gtd-outline__actionable');
	}
	scope.$on('toggle-archived', function(e, newState) {
	    scope.showArchived = newState;
	});
	hoverable = element.children('.gtd-outline__heading');
	// Process tag_string into tags
	scope.tags = scope.heading.tag_string.slice(1, -1).split(':');
	// Handler for getting the children of this heading
	scope.getChildren = function() {
	    if (!scope.loadedChildren) {
		scope.children = Heading.query({parent_id: scope.heading.id,
						field_group: 'outline'});
		scope.children.$promise.then(function(headings) {
		    scope.numArchived = headings.filter(function(obj) {
			return obj.archived === true;
		    }).length;
		    scope.loadedChildren = true;
		});
	    }
	};
	scope.$on('open-descendants', function(e) {
	    if (e.targetScope !== e.currentScope) {
		scope.toggleHeading(1);
	    }
	});
	// Get children if this is not a root level node
	if (scope.heading.level > 0) {
	    scope.getChildren();
	}
	// Handlers for clicking on the heading (may be overridden by components)
	scope.toggleHeading = function(newState) {
	    var isLeafNode
	    // 0 is closed, 1 is partly open, 2 is fully open
	    element.removeClass('gtd-outline__node--state-' + scope.state)
	    // Check if the element is nested inside a non-opening parent
	    var thisElement = $(newState.target);
	    var isNonOpening = thisElement.is(".non-opening") || (thisElement.parents(".non-opening").length > 0);
	    if ( /^\d+$/.test(newState) ) {
		// Specific state is passed as an integer
		scope.state = newState % 3;
	    }
	    else if (!isNonOpening) {
		// Verify that something should be toggled
		scope.state = (scope.state + 1) % 3;
		// Skip state 1 for leaf nodes
		isLeafNode = (scope.heading.rght - scope.heading.lft) == 1;
		if (isLeafNode && scope.state === 1) {
		    scope.state = 2;
		}
	    }
	    element.addClass('gtd-outline__node--state-' + scope.state)
	    // Get children if heading is now open
	    if (scope.state > 0) {
		scope.getChildren();
	    }
	    if (scope.state === 2) {
		scope.$broadcast('open-descendants');
	    }
	};
	// Handler for clicking the "edit" button
	scope.edit = function(e) {
	    var $off;
	    e.stopPropagation();
	    scope.isEditing = true;
	    $off = scope.$on('finishEdit', function(event, newHeading) {
		// Emitted by the owEditable when hiding the editable
		scope.isEditing = false;
		event.stopPropagation();
		if ( newHeading ) {
		    // Update existing heading
		    angular.extend(scope.heading, newHeading);
		    if ( scope.heading.todo_state ) {
			scope.todoState = scope.todoStates.filter(function(state) {
			    return state.id === scope.heading.todo_state;
			})[0];
		    } else {
			scope.todoState = null;
		    }
		}
		$off();
	    });
	};
	// Handler for clicking the "new child" button
	scope.createChild = function(e) {
	    var $off;
	    e.stopPropagation();
	    // Open the twisty if necessary
	    if ( scope.state === 0 ) {
		scope.toggleHeading(1);
	    }
	    scope.newChild = true;
	    $off = scope.$on('finishEdit', function(event, newHeading) {
		// Emitted by the owEditable when hiding the editable
		scope.newChild = false;
		event.stopPropagation();
		if ( newHeading ) {
		    // Add new child to the list
		    scope.children.push(newHeading);
		}
		$off();
	    });
	};
	// Handler for toggling the visibility (archive) of a node
	scope.archive = function(e) {
	    e.stopPropagation();
	    scope.heading.archived = !scope.heading.archived;
	    scope.heading.$update();
	};
	// Check if this node is related to the active Node
	activeHeading.ifActive(function(activeObj) {
	    var isAncestor = (activeObj.tree_id === scope.heading.tree_id &&
			      activeObj.lft > scope.heading.lft &&
			      activeObj.rght < scope.heading.rght);
	    if (activeObj.id === scope.heading.id) {
		// This is the actual heading
		element.addClass('gtd-outline__node--active');
	    } else if (isAncestor) {
		// This is an ancestor of activeHeading and should be open
		scope.toggleHeading(1);
		// Make sure archived nodes are visible if this is archived
		if (activeObj.archived) {
		    scope.showArchived = true;
		}
	    }
	});
	// Handlers for adding/removing the node from the pending weekly review
	scope.openReview = openReview;
	scope.isInOpenReview = false;
	scope.$watch(
	    // Update the DOM if the review object changes
	    function() { return scope.openReview.hasTask(scope.heading.id) },
	    function(hasTask) { scope.isInOpenReview = hasTask; }
	);
	scope.updateReview = function(newState) {
	    if (newState) {
		scope.openReview.addTask(scope.heading.id);
	    } else {
		scope.openReview.removeTask(scope.heading.id);
	    }
	};
	// scope.$watch(function() { console.log(scope.isInOpenReview); return scope.isInOpenReview }, function(newState) {
	//     // Update the review object if the checkbox changes
	//     console.log("HERE: ", newState);
	// });
	    
    }
    // Special compile function that avoids a recursive dead-lock
    function compile(tElement, tAttr) {
        var compiledContents, contents;
        contents = tElement.contents().remove();
        return function(scope, iElement, iAttr) {
            if(!compiledContents) {
                compiledContents = $compile(contents);
            }
            compiledContents(scope, function(clone, scope) {
                iElement.append(clone);
		// Now call our own link function
		link(scope, iElement, iAttr);
            });
        };
    }
    return {
	// link: link,
	compile: compile,
	templateUrl: '/static/outline-twisty.html',
	scope: {
	    heading: '=owHeading',
	},
    };
}
