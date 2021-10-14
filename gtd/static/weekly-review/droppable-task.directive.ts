"use strict";

import { module as ngModule } from 'angular';
import 'jquery-ui-dist/jquery-ui';

ngModule('orgwolf.weeklyReview')
    .directive('owDroppableTask', droppableTask);


function droppableTask() {
    /*************************************************
     * Directive that a heading drag-n-drop droppable
     * for ow-draggable elements
     * (uses jQuery ui)
     **************************************************/
    function link(scope, element, attrs) {
	var openTwisty;
	jQuery(element).droppable({
	    drop: function(event, ui) {
		let data, task;
		// var data, oldIdx, heading, oldList, newList;
		// Get context data from the draggable
		data = $(ui.draggable).data('dragDrop');
		task = data.task;
		// Now move the task to the appropriate list
		if (scope.priority === "remove") {
		    scope.review.removeTask(task.id);
		} else {
		    scope.review.moveTask(task.id, scope.priority);
		}
	    },
	    /* Visual feedback for droppability */
	    over: function(event, ui) {
		element.addClass('weekly-review__droppable-target--over');
	    },
	    out: function(event, ui) {
		element.removeClass('weekly-review__droppable-target--over');
	    },
	    activate: function(event, ui) {
		element.addClass('weekly-review__droppable-target');
	    },
	    deactivate: function(event, ui) {
		element.removeClass('weekly-review__droppable-target');
		element.removeClass('weekly-review__droppable-target--over');
	    },
	});
    }
    return {
	link: link,
	scope: {
	    'review': "=owReview",
	    'priority': "@owTaskPriority", // "primary", "secondary", "tertiary", or "extra"
	},
    };
}
