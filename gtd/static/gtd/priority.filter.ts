import {module as ngModule} from "angular";

ngModule("orgwolf.gtd")
    .filter("priority", priority);


priority.$inject = ['activeReview'];


function priority(activeReview) {
    return function(heading, review=null): string|null {
	/**
	 * Determine the priority of this heading: "A", "B", "C" or null.
	 * 
	 * @param {heading}      heading The heading object to evaluate.
	 * @param {weeklyReview} review  The weekly review object against which to check the heading.
	 *   If ``undefined``, the current activeReview will be used by default.
	 * @param {string}       result  "A", "B", or "C" priorities, or null.
	 */
	// Use a default weekly review if one is not given
	if (review === null) {
	    review = activeReview;
	}
	// Just fail if the review isn't provided yet
	if (typeof(review) === 'undefined') {
	    return null;
	}
	// Expired reviews don't need to get processed
	if (review.isExpired) {
	    return null;
	}
	// On with the task
	let result: string = null;
	var taskLists = {
	    'A': review.primary_tasks,
	    'B': review.secondary_tasks,
	    'C': review.tertiary_tasks,
	};
	// Helper function to determine whether a heading is a child of a given heading
	function isChild(parent, child) {
	    let result: boolean = false;
	    // Check if it's a decendent of the parent heading
	    if (parent.tree_id === child.tree_id &&
		child.lft >= parent.lft &&
		child.rght <= parent.rght) {
		result = true
	    }
	    return result;
	}
	// Determine if the heading is in any of the lists
	outerLoop: {
	    let taskList;
	    for (let key in taskLists) {
		taskList = taskLists[key];
		for (let task of taskList) {
		    if (isChild(task, heading)) {
			result = key;
			break outerLoop;
		    }
		}
	    }
	}
	return result;
    }
}
