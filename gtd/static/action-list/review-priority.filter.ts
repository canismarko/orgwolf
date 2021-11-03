import {module as ngModule} from "angular";

ngModule("orgwolf.actionList")
    .filter("reviewPriority", reviewPriority);


reviewPriority.$inject = [];


function reviewPriority() {
    return function(actionList) {
	return actionList;
    }
}
