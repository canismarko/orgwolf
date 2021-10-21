"use strict";

import { module as ngModule } from 'angular';
import 'jquery-ui/ui/widgets/draggable.js';


ngModule('orgwolf.weeklyReview')
    .directive('owReviewTask', reviewTask);

function reviewTask() {
    /*************************************************
     * Directive that a heading drag-n-drop draggable
     * (uses jQuery ui)
     **************************************************/
    function link(scope, element, attrs) {
        let attr = element.attr('ow-draggable');
	console.log('===');
	console.log(element);
	console.log(attr);
        scope.isDraggable = (typeof attr !== "undefined" && attr !== false);
	console.log(scope.isDraggable);
	console.log('---');
	scope.color = 5;
	if (scope.isDraggable) {
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
    }
    return {
        link: link,
	templateUrl: "/static/weekly-review/review-task.html",
        scope: {
            'task': "=owTask",
            'draggable': "=owDraggable",
        },
    };
}
