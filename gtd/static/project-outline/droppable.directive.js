"use strict";

import "angular";
import 'jquery-ui-dist/jquery-ui';

angular.module('orgwolf.projectOutline')
    .directive('owDroppable', owDroppable);


function owDroppable() {
    /*************************************************
     * Directive that a heading drag-n-drop droppable
     * for ow-draggable elements
     * (uses jQuery ui)
     **************************************************/
    function link(scope, element, attrs) {
	var openTwisty, options;
	options = {
	    drop: function(event, ui) {
		var data, oldIdx, heading, oldList, newList;
		// Get context data from the draggable
		data = $(ui.draggable).data('dragDrop');
		heading = data.heading;
		oldList = data.list;
		oldIdx = oldList.indexOf(heading);
		// Set the new parent
		var newParent = scope.heading;
		heading.parent = newParent ? newParent.id : null;
		heading.$update()
		    .then(function() {
			// Remove from old list and refresh the new list
			oldList.splice(oldIdx, 1);
			scope.loadedChildren = false;
			scope.getChildren();
		    });
	    },
	    /* Visual feedback for droppability */
	    over: function(event, ui) {
		element.addClass('droppable-over');
		// Open the tab if the user hovers for a short period
		var interval = 1000 // in milliseconds
		openTwisty = setTimeout(function() {
		    scope.$apply(function() {
			scope.toggleHeading(1);
		    });
		}, interval);
	    },
	    out: function(event, ui) {
		element.removeClass('droppable-over');
		clearTimeout(openTwisty);
	    },
	    activate: function(event, ui) {
		element.addClass('droppable-active');
	    },
	    deactivate: function(event, ui) {
		element.removeClass('droppable-active');
		element.removeClass('droppable-over');
	    },
	};
	// Function to identify ridiculous moves, like making a
	// heading its own parent
	scope.isValidMove = function() {
	};
	jQuery(element).droppable(options);
    }
    return {
	link: link,
	scope: false,
    };
}
