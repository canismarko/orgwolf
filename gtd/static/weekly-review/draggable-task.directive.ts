"use strict";

import { module as ngModule } from 'angular';
import 'jquery-ui/ui/widgets/draggable.js';


ngModule('orgwolf.weeklyReview')
    .directive('owDraggableTask', draggableTask);


function draggableTask() {
    /*************************************************
     * Directive that a heading drag-n-drop draggable
     * (uses jQuery ui)
     **************************************************/
    function link(scope, element, attrs) {
	$(element).draggable({
	    // handle: '> .gtd-outline__heading',
	    containment: '.weekly-review__box',
	    zIndex: 9999,
	    helper: 'clone',
	    revert: 'invalid',
	    start: function(event, ui) {
		// Save some context data about the draggable
		$(element).data('dragDrop', {
		    task: scope.task,
		});
	    }
	});
    }
    return {
	link: link,
	scope: {
	    'task': "=owTask",
	},
    };
}
